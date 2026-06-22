# Quadtree performance: findings & optimization research

Status: **research only — nothing here is implemented yet.** The next step is to wire the quadtree into the
force layout and confirm the real per-tick cost distribution matches what these benchmarks predict, then work
the priority list below.

## How to reproduce

```bash
npm run perf            # full suite (build/rebuild/collide/nbody/traversal/tick + sensitivity sweeps)
npm run perf:d3         # d3-force / d3-quadtree baseline on identical seeded data, density, sizes, theta
PERF_1M=1 npm run perf  # also run the 1,000,000-element size (slow)
```

The harness (`perf/bench.ts`) fixes the flaws the old suite had: deterministic seeded data, realistic packing
density (so collisions actually occur), multiple distributions, warmup runs, and percentile stats instead of a
bare mean.

## Headline result — the rebuild hypothesis is wrong

The original hunch was that **rebuilding the quadtree** dominates a force-layout tick. The realistic numbers say
the opposite. At 100k elements (gaussian, spacing 1.5, maxDepth 7, maxCapacity 8, theta 0.9):

| Stage              | Trellis (this pkg) | d3 baseline | per-tick share |
| ------------------ | -----------------: | ----------: | -------------: |
| Rebuild            |          **5 ms**  |    — (n/a)  |        ~0.4 %  |
| Build (full alloc) |           5.2 ms   |    30.4 ms  |              — |
| Collide            |         **115 ms** |   823 ms    |         ~4–9 % |
| N-body (charge)    |        **1174 ms** |  1436 ms    |        ~45–90 %|

**Rebuild is the cheapest stage — ~230× cheaper than charge and ~23× cheaper than collision.** Optimizing it
would be optimizing the wrong thing. The cost is in the *queries*, overwhelmingly in N-body charge.

Notes:
- The old benchmark reported collision at 53 ms because its data was so sparse it found **0.48** collision pairs
  per 100k nodes. The realistic density finds **213,000** pairs and costs 115 ms — that is the real number.
- The old benchmark ran N-body at `theta=4` (almost everything approximated) → 20 ms. At the realistic
  `theta=0.9` it is 1174 ms. This stage is the whole ballgame.
- Our structure is healthy versus d3: **6× faster build, 7× faster collide, 1.2× faster charge.** The small
  charge margin (vs the large collide margin) is the tell — see N-body below; we leave a lot on the table there.

### Sensitivity sweeps (100k)

- **maxDepth:** rebuild+collide is lowest at **depth 8 (97 ms)** vs depth 7 (119 ms) vs depth 9 (113 ms). The
  default of 7 is slightly too shallow for 100k. Optimal depth grows with element count.
- **Density:** collision scales with overlap as expected — spacing 0.75 → 254 ms (855k pairs), spacing 6 → 64 ms
  (13k pairs). Early, packed ticks of a layout will be the expensive ones.
- **Distribution:** uniform collide 46 ms vs gaussian/clustered ~114 ms. Skewed occupancy (a few hot, overfull
  leaves) costs ~2.5×. Real graphs are clustered, so assume the higher number.

### Caveat on the end-to-end "tick" number

The `tick` benchmark (rebuild+collide+nbody) measures ~2566 ms while the isolated stages sum to ~1294 ms. The gap
is a measurement artifact: the tick benchmark runs last, after ~2 minutes of sustained load (thermal throttling),
plus combined-working-set cache pressure. **Trust the isolated per-stage numbers and the ranking, not the
absolute tick total.** Real confirmation comes from the force-layout integration.

---

## Optimization research, prioritized by (impact × ease)

### 1. Eliminate the per-element `Set` allocation in collision — ✅ DONE, net win
`forEachCollision` allocated `this.comparedElements = new Set()` **once per element** — up to 100k allocations
per tick, all churning GC. The `Set` only existed to dedupe pairs found via boundary-straddling elements that
live in multiple leaves. Replaced with a reusable **generation-stamped `Uint32Array`**: each outer element gets a
unique generation, `comparedElements[bId] === comparedGeneration` replaces `.has/.add`, with an overflow reset at
`0xffffffff`. Zero allocation, no clearing pass, no behavior change.

**Measured (theta 1.5, spacing 1.5, 10 runs; mean ms, identical pair counts before/after):**

| Collide benchmark        | before | after | change |
| ------------------------ | -----: | ----: | -----: |
| 100k gaussian            | 113.74 | 74.31 | **−35 %** |
| 10k gaussian             |   6.87 |  5.10 | **−26 %** |
| 100k uniform             |  47.01 | 37.00 |  −21 % |
| 100k clustered           | 114.92 | 73.09 |  −36 % |
| 100k spacing 0.75 (855k pairs) | 249.50 | 130.65 | **−48 %** |
| 100k spacing 6 (13k pairs)     |  55.72 |  46.57 |  −16 % |

The win grows with collision density — exactly the expensive early-tick regime. Rebuild/N-body unchanged
(no shared code); end-to-end tick at 100k fell 1014 → 927 ms purely from the cheaper collide. Pair counts are
byte-identical and all 18 `forEachCollision` tests pass. **Clear net improvement, kept.**

### 2. Adaptive `maxDepth` — ✅ DONE, net win (with a bounded memory cost)
Default `maxDepth` is now `Quadtree.adaptiveDepth(count) = clamp(round(log4(count)), 4, 16)` (targets ~1 element
per finest leaf cell), overridable by passing an explicit `maxDepth`. Calibrated against a per-size
rebuild+collide+nbody sweep, which the formula matches exactly:

| count | optimal depth (measured) | adaptive picks | full-tick: old depth 7 → adaptive |
| ----: | :----------------------: | :------------: | :-------------------------------: |
|    1k |            5             |       5        |        2.64 → 1.80 ms (**−32 %**) |
|   10k |            7             |       7        |        19.70 → 19.70 ms (0 %)     |
|  100k |          8 (9 ≈ tie)     |       8        |       434 → 277 ms (**−36 %**)    |
|    1M |            —             |       10       |        (depth 7 is unusable here) |

**Drawback (quantified):** depth scales the *complete* tree, so a deeper pick costs memory and rebuild time.
At 100k, adaptive's depth 8 vs the old 7: rebuild **4.90 → 9.64 ms** (~2×) and tree memory **0.35 → 1.40 MB**
(4×, since quad count = `(4^(depth+1)-1)/3`). For 1M, depth 10 ⇒ ~1.4M quads ≈ 22 MB tree. These costs are real
but bounded and dominated by the collide+charge savings (the +4.7 ms rebuild penalty buys ~157 ms back on the
tick). For *small* graphs adaptive picks a *shallower* tree than the old default (1k: depth 5 not 7) ⇒ less memory
*and* faster. All 156 tests pass (tiny-input tests merge to the root and are depth-independent).
**Net win, kept** — the only caution is memory at very large N, which is unavoidable for correctness/speed there.

### 3. Approximate far leaf quads as a single body in N-body — ✅ DONE, net win
`compareBodies` now applies the theta test to leaves too: when the query element's center is **outside** a leaf
(so the leaf's center-of-mass cannot include the element itself) and the leaf is distant enough, it is collapsed
to a single body at its center of mass. When the element is inside its home leaf, we still enumerate and skip
self. All 156 tests pass.

**Speed (theta 1.5, spacing 1.5, 10 runs):**

| Stage @ 100k | before #3 | after #3 | change |
| ------------ | --------: | -------: | -----: |
| N-body       |    251.6  |   157.0  | **−38 %** (interactions 12.5M → 6.2M, −50 %) |
| Tick         |    463.5  |   269.7  | **−42 %** |

**Accuracy (vs brute-force exact, point masses — charge's correct regime, maxDepth 8):** #3 does **not** regress
accuracy — it slightly improves it. Mean relative force error vs exact: pre-#3 0.06–0.26 %, #3 0.02–0.06 %.
A mass-seen probe shows #3 lowers the per-element mass overcount (7.5 vs 18.4 of n−1=2999), because the
`elementInside` guard avoids including the query element in approximations more often than the old leaf
enumeration did. **Net win, kept.**

### 3b. `forEachBody` straddler double-count — ✅ FIXED (one-line, single tree, no extra memory)
While evaluating #3 we found `forEachBody` could badly mis-count when elements have collision radii. Root cause,
pinned precisely (clean fixed-scale rig, identical positions, varying only radius):

- Quad `aggregateMass`/`centerOfMass` are **already correct** — verified 0 mismatches over 3,333 quads.
  `insert` only adds an element's mass to the leaf its *center* is in, and `merge` sums child masses. So the
  mass machinery never counted overlapping-but-not-centered nodes.
- The bug was in the **leaf enumeration** path: it emitted every entry in the leaf's `quadElements` list,
  including boundary-straddlers that are *replicated* into the leaf for collision detection. Those straddlers
  were also emitted from their home leaf (or folded into a COM), so they were double-counted. Error scales with
  radius: massErr per element 49 (r=3) → 326 (r=8); force error 193 % → 1098 % at θ0.5.

**Fix:** in the enumeration loop, skip elements whose center is outside the current leaf
(`bodyX ∈ [minX,maxX) && bodyY ∈ [minY,maxY)`). Each element is then emitted exactly once — from its home leaf,
or via the COM of an approximated ancestor. This also correctly dedups across the approximate/enumerate boundary.

**Result (clean rig):** mass conservation exact (massErr 0); force error becomes normal Barnes-Hut and
**radius-independent** — r=3 and r=8 both give ~2 % at θ0.5, ~10 % at θ0.9. All 156 tests pass.

**Cost:** one bounds check, **zero extra memory, no structural/merge changes, no second tree.** N-body +~12 %,
tick +~3 % at 100k (the straddler list entries are still traversed before being skipped). The merge-structure
difference from replication does *not* meaningfully affect charge accuracy (r=3 vs r=8 nearly identical), so the
deeper "decouple the tree structure" option is unnecessary. If the +12 % ever matters, it can be reclaimed later
by not threading straddlers into the charge-traversed lists — but that is the complex path and isn't needed now.

> Note: an earlier writeup here cited "46–92 % point-vs-circle divergence." That figure was a **test-rig
> confound** — the data generator scaled cloud size with radius, so the "points" baseline was a tiny cloud where
> the softening term dominated and hid all approximation error. The clean rig above supersedes it.

> Aside: building with **radius exactly 0** produces an empty tree — `insert`'s overlap test `dx²+dy² < r²`
> rejects even an element's own cell when r=0. Use a tiny positive radius if a true point index is ever wanted.

#### Original proposal (for reference)
This is the existing TODO at index.ts:558. Today `compareBodies` only approximates at **branch** quads; every
**leaf** always enumerates its ≤8 elements individually (mass=1 each). That is why we measure **81.8M
interactions** for 100k nodes (~818/node). Leaves are the most numerous quads, so this is where the interactions
pile up. We already store center-of-mass + aggregate mass for every quad (including leaves) in `quadMasses`, so a
far leaf can be collapsed to one body via the same theta test used for branches. Expected: large cut in
interaction count → the charge stage (the dominant cost) drops substantially, likely pushing us well past d3's
1.2× margin. Trade-off: slightly more approximate forces for close-but-not-recursed leaves — tune with theta.

### 4. Leaf-local collision instead of root-down-per-element — ✅ DONE (#4b), large net win; supersedes #1
Implemented the leaf-by-leaf variant with **stateless canonicalization**. `forEachCollision` now recurses the
tree carrying bounds; at each populated leaf it compares members pairwise (linked-list inner loop ⇒ each pair
once per leaf). A colliding pair is reported only from the leaf containing the proportional point
`P = A + (B-A)·rA/(rA+rB)` — provably inside both circles on collision, so the leaf holding P always lists both,
and leaves partition space ⇒ exactly one report. No dedup buffer, no descent.

**Correctness:** differential-tested against brute-force O(n²) over 27 cases (uniform/gaussian/clustered ×
n=50/500/5000 × spacing 0.5/1/2) — zero missed, zero extra, zero duplicate pairs. All 156 unit tests pass.

**Measured (theta 1.5, spacing 1.5, 10 runs; mean ms, identical pair counts) vs the post-#1/#2 baseline:**

| Collide benchmark | #1+#2 (adaptive) | #4b | change |
| ----------------- | ---------------: | --: | -----: |
| 100k gaussian     |            57.61 | 23.44 | **−59 %** |
| 10k gaussian      |             5.16 |  2.16 | −58 % |
| 100k uniform      |            37.00 | 11.60 | −69 % |
| 100k clustered    |            ~73*  | 27.27 | — |
| 100k spacing 0.75 (855k pairs) | 130.65* | 77.46 | — |

Cumulative collide @ 100k: original **113.7 → 23.4 ms (4.9×)**; ~35× faster than d3's 823 ms.

**Supersedes #1:** #4b's canonicalization replaces #1's generation-stamp dedup entirely, so the
`comparedElements`/`comparedGeneration` fields (and their per-construct `Uint32Array(elementCount)` allocation)
were removed. `traversedElements` is retained — still used by `merge`. **Net win, kept.**

*Starred figures are from the depth-7 (#1) run; the adaptive-depth #4b figures are the relevant current numbers.*

#### Original proposal (for reference)
Currently each element re-traverses from the root (`compareCollisions(cb, 0, ...)`). But because every element is
already inserted into **every leaf its bounding circle overlaps**, any two overlapping circles necessarily share
at least one leaf (the leaf covering their overlap region). So **iterating each leaf and comparing its members
pairwise finds all colliding pairs** — no per-element root descent. Cost becomes `O(leaves × occupancy²)` (≈5400
× ≤8² ≈ 345k comparisons) with a stamp-based dedup for pairs that co-occur in multiple leaves (folds in idea #1).
This removes the deepest, most repeated traversal in the collide path. Needs careful dedup but is a clean
structural simplification + speedup.

### 7. Inlined charge kernel (`applyManyBodyForce`) — ✅ DONE, net win
Profiling the **real** force tick (ego-forest data, θ=0.5, distanceMax 4000) showed charge is **91–96 % of the
tick**, and within charge the cost is **traversal + per-interaction callback (~86 %), not the force math (~14 %)**.
Measuring an inlined traversal (no callback) vs `forEachBody(cb)` at 10k: **61 ms → 39 ms** — the per-interaction
closure was ~36 % of charge.

Added `Quadtree.applyManyBodyForce(forces, strength, theta, distanceMin2, distanceMax)`: it mirrors
`forEachBody`/`compareBodies` but inlines an inverse-square accumulation into a Float32 `forces` buffer (stride 2),
eliminating the callback. The force `Simulation.charge()` now calls it (then folds forces into velocity) instead
of `forEachBody`. `forEachBody` stays for generic/test/bench use.

**Measured:** isolated charge **1.46–1.49× faster** (10k: 67 → 46 ms). Forces match the callback path to ~1e-5 %
(only Float32 accumulation-order differences). All 156 tests pass; layout stays deterministic, NaN-free, bounded.
Coincident bodies (dist²=0) now contribute nothing (was a 1e-6 jiggle) — negligible and more deterministic.

### 5. Compact `quadElements` linked list into contiguous per-leaf arrays — *broad, cache locality*
The hot inner loops in both collide and charge walk a **linked list** (`quadElements[ptr+1]`), which is
cache-hostile pointer chasing across 81M+ touches. The `notes.md` compaction plan (contiguous
`[length, ...elementIds]` per leaf) would make leaf enumeration a linear scan. Benefits every query stage and
composes naturally with ideas #3 and #4. Medium effort; measure the build-time cost of the extra compaction pass
against the query-time savings.

### 6. Parallelize charge + collision across Web Workers (SharedArrayBuffer) — *highest ceiling, scales to 1M*
Charge and collision are embarrassingly parallel over elements, and the tree is read-only during the query phase.
Build once on the main thread, share `quads`/`quadMasses`/`quadElements`/`elements` via `SharedArrayBuffer`, then
fan elements out across N workers each accumulating into its own force slice (merge after). The force package
already uses `SharedArrayBuffer` + a worker, so the plumbing exists. Near-linear speedup on the dominant charge
stage — the most promising path to a smooth 1M-node layout. Medium-high effort.

### Lower priority / future research
- **Dual-tree Barnes-Hut / WSPD (Fast Multipole-style):** compare tree-node to tree-node instead of
  body-to-tree, taking charge from ~N·logN toward ~N. Big win at 1M+, significant complexity. Worth a spike once
  ideas #3–#6 are exhausted.
- **WASM + SIMD** for the inner force/collision loops: high ceiling, high effort; only after the algorithmic
  wins above, since they reduce the work SIMD would accelerate.
- **Rebuild micro-opts** (skip/limit the three `.fill()` clears, reuse bounds): real but ~5 ms — not worth it
  unless rebuild unexpectedly dominates after integration.

---

## Verification plan (next step)

1. Integrate the current quadtree API (`forEachCollision` / `forEachBody`) into the force `Simulation` (it still
   calls the old removed `new Quadtree(nodes, 4, 8, …)` / `tree.find(…)` API and won't run).
2. Profile a real layout tick across sizes/distributions and confirm the ranking **charge ≫ collide ≫ rebuild**.
3. If confirmed, execute the priority list above, re-running `npm run perf` + `npm run perf:d3` after each change
   to measure deltas against this baseline.
