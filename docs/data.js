const hierarchy = trellis.layout.Hierarchy.Layout()

const categoricalScale = d3.scaleOrdinal(d3.schemeTableau10)
function color(x) {
  return categoricalScale(x)
}

function styleNode(group) {
  return {
    color: color(group),
    labelSize: 10,
    labelWordWrap: 260,
    stroke: [{ color: '#FFF', width: 2 }, { color: color(group), width: 1 }],
    icon: { type: 'textIcon', family: 'Material Icons', text: 'person', color: '#fff', size: 21 },
    badge: [{
      position: 45,
      color: color(group),
      stroke: '#FFF',
      icon: {
        type: 'textIcon',
        family: 'Helvetica',
        size: 10,
        color: '#FFF',
        text: '8',
      }
    }],
  }
}

const simpleEdges = [
  { source: 'Napoleon', target: 'Myriel' },
  { source: 'Mlle.Baptistine', target: 'Myriel' },
  { source: 'Mme.Magloire', target: 'Myriel' },
  { source: 'Mme.Magloire', target: 'Mlle.Baptistine' },
  { source: 'CountessdeLo', target: 'Myriel' },
  { source: 'Geborand', target: 'Myriel' },
  { source: 'Champtercier', target: 'Myriel' },
  { source: 'Cravatte', target: 'Myriel' },
  { source: 'Count', target: 'Myriel' },
  { source: 'OldMan', target: 'Myriel' },
  { source: 'Valjean', target: 'Labarre' },
  { source: 'Valjean', target: 'Mme.Magloire' },
  { source: 'Valjean', target: 'Mlle.Baptistine' },
  { source: 'Valjean', target: 'Myriel' },
  { source: 'Marguerite', target: 'Valjean' },
  { source: 'Mme.deR', target: 'Valjean' },
  { source: 'Isabeau', target: 'Valjean' },
  { source: 'Gervais', target: 'Valjean' },
  { source: 'Listolier', target: 'Tholomyes' },
  { source: 'Fameuil', target: 'Tholomyes' },
  { source: 'Fameuil', target: 'Listolier' },
  { source: 'Blacheville', target: 'Tholomyes' },
  { source: 'Blacheville', target: 'Listolier' },
  { source: 'Blacheville', target: 'Fameuil' },
  { source: 'Favourite', target: 'Tholomyes' },
  { source: 'Favourite', target: 'Listolier' },
  { source: 'Favourite', target: 'Fameuil' },
  { source: 'Favourite', target: 'Blacheville' },
  { source: 'Dahlia', target: 'Tholomyes' },
  { source: 'Dahlia', target: 'Listolier' },
  { source: 'Dahlia', target: 'Fameuil' },
  { source: 'Dahlia', target: 'Blacheville' },
  { source: 'Dahlia', target: 'Favourite' },
  { source: 'Zephine', target: 'Tholomyes' },
  { source: 'Zephine', target: 'Listolier' },
  { source: 'Zephine', target: 'Fameuil' },
  { source: 'Zephine', target: 'Blacheville' },
  { source: 'Zephine', target: 'Favourite' },
  { source: 'Zephine', target: 'Dahlia' },
  { source: 'Fantine', target: 'Tholomyes' },
  { source: 'Fantine', target: 'Listolier' },
  { source: 'Fantine', target: 'Fameuil' },
  { source: 'Fantine', target: 'Blacheville' },
  { source: 'Fantine', target: 'Favourite' },
  { source: 'Fantine', target: 'Dahlia' },
  { source: 'Fantine', target: 'Zephine' },
  { source: 'Fantine', target: 'Marguerite' },
  { source: 'Fantine', target: 'Valjean' },
  { source: 'Mme.Thenardier', target: 'Fantine' },
  { source: 'Mme.Thenardier', target: 'Valjean' },
  { source: 'Thenardier', target: 'Mme.Thenardier' },
  { source: 'Thenardier', target: 'Fantine' },
  { source: 'Thenardier', target: 'Valjean' },
  { source: 'Cosette', target: 'Mme.Thenardier' },
  { source: 'Cosette', target: 'Valjean' },
  { source: 'Cosette', target: 'Tholomyes' },
  { source: 'Cosette', target: 'Thenardier' },
  { source: 'Javert', target: 'Valjean' },
  { source: 'Javert', target: 'Fantine' },
  { source: 'Javert', target: 'Thenardier' },
  { source: 'Javert', target: 'Mme.Thenardier' },
  { source: 'Javert', target: 'Cosette' },
  { source: 'Fauchelevent', target: 'Valjean' },
  { source: 'Fauchelevent', target: 'Javert' },
  { source: 'Bamatabois', target: 'Fantine' },
  { source: 'Bamatabois', target: 'Javert' },
  { source: 'Bamatabois', target: 'Valjean' },
  { source: 'Perpetue', target: 'Fantine' },
  { source: 'Simplice', target: 'Perpetue' },
  { source: 'Simplice', target: 'Valjean' },
  { source: 'Simplice', target: 'Fantine' },
  { source: 'Simplice', target: 'Javert' },
  { source: 'Scaufflaire', target: 'Valjean' },
  { source: 'Woman1', target: 'Valjean' },
  { source: 'Woman1', target: 'Javert' },
  { source: 'Judge', target: 'Valjean' },
  { source: 'Judge', target: 'Bamatabois' },
  { source: 'Champmathieu', target: 'Valjean' },
  { source: 'Champmathieu', target: 'Judge' },
  { source: 'Champmathieu', target: 'Bamatabois' },
  { source: 'Brevet', target: 'Judge' },
  { source: 'Brevet', target: 'Champmathieu' },
  { source: 'Brevet', target: 'Valjean' },
  { source: 'Brevet', target: 'Bamatabois' },
  { source: 'Chenildieu', target: 'Judge' },
  { source: 'Chenildieu', target: 'Champmathieu' },
  { source: 'Chenildieu', target: 'Brevet' },
  { source: 'Chenildieu', target: 'Valjean' },
  { source: 'Chenildieu', target: 'Bamatabois' },
  { source: 'Cochepaille', target: 'Judge' },
  { source: 'Cochepaille', target: 'Champmathieu' },
  { source: 'Cochepaille', target: 'Brevet' },
  { source: 'Cochepaille', target: 'Chenildieu' },
  { source: 'Cochepaille', target: 'Valjean' },
  { source: 'Cochepaille', target: 'Bamatabois' },
  { source: 'Pontmercy', target: 'Thenardier' },
  { source: 'Boulatruelle', target: 'Thenardier' },
  { source: 'Eponine', target: 'Mme.Thenardier' },
  { source: 'Eponine', target: 'Thenardier' },
  { source: 'Anzelma', target: 'Eponine' },
  { source: 'Anzelma', target: 'Thenardier' },
  { source: 'Anzelma', target: 'Mme.Thenardier' },
  { source: 'Woman2', target: 'Valjean' },
  { source: 'Woman2', target: 'Cosette' },
  { source: 'Woman2', target: 'Javert' },
  { source: 'MotherInnocent', target: 'Fauchelevent' },
  { source: 'MotherInnocent', target: 'Valjean' },
  { source: 'Gribier', target: 'Fauchelevent' },
  { source: 'Mme.Burgon', target: 'Jondrette' },
  { source: 'Gavroche', target: 'Mme.Burgon' },
  { source: 'Gavroche', target: 'Thenardier' },
  { source: 'Gavroche', target: 'Javert' },
  { source: 'Gavroche', target: 'Valjean' },
  { source: 'Gillenormand', target: 'Cosette' },
  { source: 'Gillenormand', target: 'Valjean' },
  { source: 'Magnon', target: 'Gillenormand' },
  { source: 'Magnon', target: 'Mme.Thenardier' },
  { source: 'Mlle.Gillenormand', target: 'Gillenormand' },
  { source: 'Mlle.Gillenormand', target: 'Cosette' },
  { source: 'Mlle.Gillenormand', target: 'Valjean' },
  { source: 'Mme.Pontmercy', target: 'Mlle.Gillenormand' },
  { source: 'Mme.Pontmercy', target: 'Pontmercy' },
  { source: 'Mlle.Vaubois', target: 'Mlle.Gillenormand' },
  { source: 'Lt.Gillenormand', target: 'Mlle.Gillenormand' },
  { source: 'Lt.Gillenormand', target: 'Gillenormand' },
  { source: 'Lt.Gillenormand', target: 'Cosette' },
  { source: 'Marius', target: 'Mlle.Gillenormand' },
  { source: 'Marius', target: 'Gillenormand' },
  { source: 'Marius', target: 'Pontmercy' },
  { source: 'Marius', target: 'Lt.Gillenormand' },
  { source: 'Marius', target: 'Cosette' },
  { source: 'Marius', target: 'Valjean' },
  { source: 'Marius', target: 'Tholomyes' },
  { source: 'Marius', target: 'Thenardier' },
  { source: 'Marius', target: 'Eponine' },
  { source: 'Marius', target: 'Gavroche' },
  { source: 'BaronessT', target: 'Gillenormand' },
  { source: 'BaronessT', target: 'Marius' },
  { source: 'Mabeuf', target: 'Marius' },
  { source: 'Mabeuf', target: 'Eponine' },
  { source: 'Mabeuf', target: 'Gavroche' },
  { source: 'Enjolras', target: 'Marius' },
  { source: 'Enjolras', target: 'Gavroche' },
  { source: 'Enjolras', target: 'Javert' },
  { source: 'Enjolras', target: 'Mabeuf' },
  { source: 'Enjolras', target: 'Valjean' },
  { source: 'Combeferre', target: 'Enjolras' },
  { source: 'Combeferre', target: 'Marius' },
  { source: 'Combeferre', target: 'Gavroche' },
  { source: 'Combeferre', target: 'Mabeuf' },
  { source: 'Prouvaire', target: 'Gavroche' },
  { source: 'Prouvaire', target: 'Enjolras' },
  { source: 'Prouvaire', target: 'Combeferre' },
  { source: 'Feuilly', target: 'Gavroche' },
  { source: 'Feuilly', target: 'Enjolras' },
  { source: 'Feuilly', target: 'Prouvaire' },
  { source: 'Feuilly', target: 'Combeferre' },
  { source: 'Feuilly', target: 'Mabeuf' },
  { source: 'Feuilly', target: 'Marius' },
  { source: 'Courfeyrac', target: 'Marius' },
  { source: 'Courfeyrac', target: 'Enjolras' },
  { source: 'Courfeyrac', target: 'Combeferre' },
  { source: 'Courfeyrac', target: 'Gavroche' },
  { source: 'Courfeyrac', target: 'Mabeuf' },
  { source: 'Courfeyrac', target: 'Eponine' },
  { source: 'Courfeyrac', target: 'Feuilly' },
  { source: 'Courfeyrac', target: 'Prouvaire' },
  { source: 'Bahorel', target: 'Combeferre' },
  { source: 'Bahorel', target: 'Gavroche' },
  { source: 'Bahorel', target: 'Courfeyrac' },
  { source: 'Bahorel', target: 'Mabeuf' },
  { source: 'Bahorel', target: 'Enjolras' },
  { source: 'Bahorel', target: 'Feuilly' },
  { source: 'Bahorel', target: 'Prouvaire' },
  { source: 'Bahorel', target: 'Marius' },
  { source: 'Bossuet', target: 'Marius' },
  { source: 'Bossuet', target: 'Courfeyrac' },
  { source: 'Bossuet', target: 'Gavroche' },
  { source: 'Bossuet', target: 'Bahorel' },
  { source: 'Bossuet', target: 'Enjolras' },
  { source: 'Bossuet', target: 'Feuilly' },
  { source: 'Bossuet', target: 'Prouvaire' },
  { source: 'Bossuet', target: 'Combeferre' },
  { source: 'Bossuet', target: 'Mabeuf' },
  { source: 'Bossuet', target: 'Valjean' },
  { source: 'Joly', target: 'Bahorel' },
  { source: 'Joly', target: 'Bossuet' },
  { source: 'Joly', target: 'Gavroche' },
  { source: 'Joly', target: 'Courfeyrac' },
  { source: 'Joly', target: 'Enjolras' },
  { source: 'Joly', target: 'Feuilly' },
  { source: 'Joly', target: 'Prouvaire' },
  { source: 'Joly', target: 'Combeferre' },
  { source: 'Joly', target: 'Mabeuf' },
  { source: 'Joly', target: 'Marius' },
  { source: 'Grantaire', target: 'Bossuet' },
  { source: 'Grantaire', target: 'Enjolras' },
  { source: 'Grantaire', target: 'Combeferre' },
  { source: 'Grantaire', target: 'Courfeyrac' },
  { source: 'Grantaire', target: 'Joly' },
  { source: 'Grantaire', target: 'Gavroche' },
  { source: 'Grantaire', target: 'Bahorel' },
  { source: 'Grantaire', target: 'Feuilly' },
  { source: 'Grantaire', target: 'Prouvaire' },
  { source: 'MotherPlutarch', target: 'Mabeuf' },
  { source: 'Gueulemer', target: 'Thenardier' },
  { source: 'Gueulemer', target: 'Valjean' },
  { source: 'Gueulemer', target: 'Mme.Thenardier' },
  { source: 'Gueulemer', target: 'Javert' },
  { source: 'Gueulemer', target: 'Gavroche' },
  { source: 'Gueulemer', target: 'Eponine' },
  { source: 'Babet', target: 'Thenardier' },
  { source: 'Babet', target: 'Gueulemer' },
  { source: 'Babet', target: 'Valjean' },
  { source: 'Babet', target: 'Mme.Thenardier' },
  { source: 'Babet', target: 'Javert' },
  { source: 'Babet', target: 'Gavroche' },
  { source: 'Babet', target: 'Eponine' },
  { source: 'Claquesous', target: 'Thenardier' },
  { source: 'Claquesous', target: 'Babet' },
  { source: 'Claquesous', target: 'Gueulemer' },
  { source: 'Claquesous', target: 'Valjean' },
  { source: 'Claquesous', target: 'Mme.Thenardier' },
  { source: 'Claquesous', target: 'Javert' },
  { source: 'Claquesous', target: 'Eponine' },
  { source: 'Claquesous', target: 'Enjolras' },
  { source: 'Montparnasse', target: 'Javert' },
  { source: 'Montparnasse', target: 'Babet' },
  { source: 'Montparnasse', target: 'Gueulemer' },
  { source: 'Montparnasse', target: 'Claquesous' },
  { source: 'Montparnasse', target: 'Valjean' },
  { source: 'Montparnasse', target: 'Gavroche' },
  { source: 'Montparnasse', target: 'Eponine' },
  { source: 'Montparnasse', target: 'Thenardier' },
  { source: 'Toussaint', target: 'Cosette' },
  { source: 'Toussaint', target: 'Javert' },
  { source: 'Toussaint', target: 'Valjean' },
  { source: 'Child1', target: 'Gavroche' },
  { source: 'Child2', target: 'Gavroche' },
  { source: 'Child2', target: 'Child1' },
  { source: 'Brujon', target: 'Babet' },
  { source: 'Brujon', target: 'Gueulemer' },
  { source: 'Brujon', target: 'Thenardier' },
  { source: 'Brujon', target: 'Gavroche' },
  { source: 'Brujon', target: 'Eponine' },
  { source: 'Brujon', target: 'Claquesous' },
  { source: 'Brujon', target: 'Montparnasse' },
  { source: 'Mme.Hucheloup', target: 'Bossuet' },
  { source: 'Mme.Hucheloup', target: 'Joly' },
  { source: 'Mme.Hucheloup', target: 'Grantaire' },
  { source: 'Mme.Hucheloup', target: 'Bahorel' },
  { source: 'Mme.Hucheloup', target: 'Courfeyrac' },
  { source: 'Mme.Hucheloup', target: 'Gavroche' },
  { source: 'Mme.Hucheloup', target: 'Enjolras' }
].map(({ source, target }) => ({ id: `${source}:${target}`, source, target }))

const simpleNodes = [
  { id: 'Myriel', group: 1 },
  { id: 'Napoleon', group: 1 },
  { id: 'Mlle.Baptistine', group: 1 },
  { id: 'Mme.Magloire', group: 1 },
  { id: 'CountessdeLo', group: 1 },
  { id: 'Geborand', group: 1 },
  { id: 'Champtercier', group: 1 },
  { id: 'Cravatte', group: 1 },
  { id: 'Count', group: 1 },
  { id: 'OldMan', group: 1 },
  { id: 'Labarre', group: 2 },
  { id: 'Valjean', group: 2 },
  { id: 'Marguerite', group: 3 },
  { id: 'Mme.deR', group: 2 },
  { id: 'Isabeau', group: 2 },
  { id: 'Gervais', group: 2 },
  { id: 'Tholomyes', group: 3 },
  { id: 'Listolier', group: 3 },
  { id: 'Fameuil', group: 3 },
  { id: 'Blacheville', group: 3 },
  { id: 'Favourite', group: 3 },
  { id: 'Dahlia', group: 3 },
  { id: 'Zephine', group: 3 },
  { id: 'Fantine', group: 3 },
  { id: 'Mme.Thenardier', group: 4 },
  { id: 'Thenardier', group: 4 },
  { id: 'Cosette', group: 5 },
  { id: 'Javert', group: 4 },
  { id: 'Fauchelevent', group: 0 },
  { id: 'Bamatabois', group: 2 },
  { id: 'Perpetue', group: 3 },
  { id: 'Simplice', group: 2 },
  { id: 'Scaufflaire', group: 2 },
  { id: 'Woman1', group: 2 },
  { id: 'Judge', group: 2 },
  { id: 'Champmathieu', group: 2 },
  { id: 'Brevet', group: 2 },
  { id: 'Chenildieu', group: 2 },
  { id: 'Cochepaille', group: 2 },
  { id: 'Pontmercy', group: 4 },
  { id: 'Boulatruelle', group: 6 },
  { id: 'Eponine', group: 4 },
  { id: 'Anzelma', group: 4 },
  { id: 'Woman2', group: 5 },
  { id: 'MotherInnocent', group: 0 },
  { id: 'Gribier', group: 0 },
  { id: 'Jondrette', group: 7 },
  { id: 'Mme.Burgon', group: 7 },
  { id: 'Gavroche', group: 8 },
  { id: 'Gillenormand', group: 5 },
  { id: 'Magnon', group: 5 },
  { id: 'Mlle.Gillenormand', group: 5 },
  { id: 'Mme.Pontmercy', group: 5 },
  { id: 'Mlle.Vaubois', group: 5 },
  { id: 'Lt.Gillenormand', group: 5 },
  { id: 'Marius', group: 8 },
  { id: 'BaronessT', group: 5 },
  { id: 'Mabeuf', group: 8 },
  { id: 'Enjolras', group: 8 },
  { id: 'Combeferre', group: 8 },
  { id: 'Prouvaire', group: 8 },
  { id: 'Feuilly', group: 8 },
  { id: 'Courfeyrac', group: 8 },
  { id: 'Bahorel', group: 8 },
  { id: 'Bossuet', group: 8 },
  { id: 'Joly', group: 8 },
  { id: 'Grantaire', group: 8 },
  { id: 'MotherPlutarch', group: 9 },
  { id: 'Gueulemer', group: 4 },
  { id: 'Babet', group: 4 },
  { id: 'Claquesous', group: 4 },
  { id: 'Montparnasse', group: 4 },
  { id: 'Toussaint', group: 5 },
  { id: 'Child1', group: 10 },
  { id: 'Child2', group: 10 },
  { id: 'Brujon', group: 4 },
  { id: 'Mme.Hucheloup', group: 8 }
].map(({ id, group }) => ({ id, label: id, radius: 18, style: styleNode(group) }))

const simpleData = { nodes: simpleNodes, edges: simpleEdges }

const hierarchyNodes = [
  {
    "id": "rich.dimichele@enron.com",
    "label": "rich.dimichele@enron.com",
    "count": 3
  },
  {
    "id": "jeff.skilling@enron.com",
    "label": "jeff.skilling@enron.com",
    "count": 15
  },
  {
    "id": "j..kean@enron.com",
    "label": "j..kean@enron.com",
    "count": 7
  },
  {
    "id": "kenneth.lay@enron.com",
    "label": "kenneth.lay@enron.com",
    "count": 13
  },
  {
    "id": "d..steffes@enron.com",
    "label": "d..steffes@enron.com",
    "count": 7
  },
  {
    "id": "louise.kitchen@enron.com",
    "label": "louise.kitchen@enron.com",
    "count": 12
  },
  {
    "id": "steven.kean@enron.com",
    "label": "steven.kean@enron.com",
    "count": 5
  },
  {
    "id": "dolores.muzzy@enron.com",
    "label": "dolores.muzzy@enron.com",
    "count": 3
  },
  {
    "id": "julie.ferrara@enron.com",
    "label": "julie.ferrara@enron.com",
    "count": 3
  },
  {
    "id": "torrey.moorer@enron.com",
    "label": "torrey.moorer@enron.com",
    "count": 2
  },
  {
    "id": "judy.walters@enron.com",
    "label": "judy.walters@enron.com",
    "count": 1
  },
  {
    "id": "chad.gardner@enron.com",
    "label": "chad.gardner@enron.com",
    "count": 1
  },
  {
    "id": "bill.cordes@enron.com",
    "label": "bill.cordes@enron.com",
    "count": 2
  },
  {
    "id": "akhoja@enron.com",
    "label": "akhoja@enron.com",
    "count": 1
  },
  {
    "id": "dconnal@enron.com",
    "label": "dconnal@enron.com",
    "count": 1
  },
  {
    "id": "aborgatt@azurix.com",
    "label": "aborgatt@azurix.com",
    "count": 1
  },
  {
    "id": "mbaker2@enron.com",
    "label": "mbaker2@enron.com",
    "count": 1
  },
  {
    "id": "feliciag@marcusevanstx.com",
    "label": "feliciag@marcusevanstx.com",
    "count": 1
  },
  {
    "id": "mvasque@enron.com",
    "label": "mvasque@enron.com",
    "count": 1
  }
].map((node) => ({ ...node, style: styleNode(node.count), radius: 18 }))

const hierarchyEdges = [
  {
    "source": "rich.dimichele@enron.com",
    "target": "jeff.skilling@enron.com",
    "subject": "FW: MSN - Jesse Call Summary",
    "timestamp": 996607382000
  },
  {
    "source": "j..kean@enron.com",
    "target": "kenneth.lay@enron.com",
    "subject": "",
    "timestamp": 1005770116000
  },
  {
    "source": "j..kean@enron.com",
    "target": "d..steffes@enron.com",
    "subject": "RE: RTO week message",
    "timestamp": 1001941166000
  },
  {
    "source": "j..kean@enron.com",
    "target": "louise.kitchen@enron.com",
    "subject": "RE:",
    "timestamp": 1000254393000
  },
  {
    "source": "steven.kean@enron.com",
    "target": "kenneth.lay@enron.com",
    "subject": "Call to Bob Glynn",
    "timestamp": 986829120000
  },
  {
    "source": "steven.kean@enron.com",
    "target": "jeff.skilling@enron.com",
    "subject": "California - Jan 13 meeting",
    "timestamp": 979480320000
  },
  {
    "source": "steven.kean@enron.com",
    "target": "louise.kitchen@enron.com",
    "subject": "California Update--0717.01",
    "timestamp": 995440620000
  },
  {
    "source": "dolores.muzzy@enron.com",
    "target": "julie.ferrara@enron.com",
    "subject": "Rodeo tickets for tonight's performance",
    "timestamp": 982854000000
  },
  {
    "source": "kenneth.lay@enron.com",
    "target": "torrey.moorer@enron.com",
    "subject": "Associate/Analyst Program",
    "timestamp": 998591065000
  },
  {
    "source": "kenneth.lay@enron.com",
    "target": "judy.walters@enron.com",
    "subject": "Thank You",
    "timestamp": 991252847000
  },
  {
    "source": "kenneth.lay@enron.com",
    "target": "chad.gardner@enron.com",
    "subject": "Associate/Analyst Program",
    "timestamp": 998591065000
  },
  {
    "source": "kenneth.lay@enron.com",
    "target": "j..kean@enron.com",
    "subject": "FW: Salary",
    "timestamp": 1004391675000
  },
  {
    "source": "kenneth.lay@enron.com",
    "target": "julie.ferrara@enron.com",
    "subject": "Associate/Analyst Program",
    "timestamp": 998591065000
  },
  {
    "source": "kenneth.lay@enron.com",
    "target": "louise.kitchen@enron.com",
    "subject": "Executive Committee",
    "timestamp": 998771284000
  },
  {
    "source": "kenneth.lay@enron.com",
    "target": "d..steffes@enron.com",
    "subject": "Associate/Analyst Program",
    "timestamp": 998591065000
  },
  {
    "source": "kenneth.lay@enron.com",
    "target": "rich.dimichele@enron.com",
    "subject": "Executive Committee",
    "timestamp": 998771284000
  },
  {
    "source": "kenneth.lay@enron.com",
    "target": "dolores.muzzy@enron.com",
    "subject": "Associate/Analyst Program",
    "timestamp": 998591065000
  },
  {
    "source": "kenneth.lay@enron.com",
    "target": "bill.cordes@enron.com",
    "subject": "Executive Committee",
    "timestamp": 998771284000
  },
  {
    "source": "d..steffes@enron.com",
    "target": "louise.kitchen@enron.com",
    "subject": "FW: FERC Oversight",
    "timestamp": 1011224596000
  },
  {
    "source": "d..steffes@enron.com",
    "target": "j..kean@enron.com",
    "subject": "FW: Doubletree PowerPoint Presentation",
    "timestamp": 1008878799000
  },
  {
    "source": "d..steffes@enron.com",
    "target": "dolores.muzzy@enron.com",
    "subject": "FW: Save the Date - September 5th",
    "timestamp": 998861269000
  },
  {
    "source": "jeff.skilling@enron.com",
    "target": "rich.dimichele@enron.com",
    "subject": "Please Plan to Attend",
    "timestamp": 996693958000
  },
  {
    "source": "jeff.skilling@enron.com",
    "target": "d..steffes@enron.com",
    "subject": "Please Plan to Attend",
    "timestamp": 997194012000
  },
  {
    "source": "jeff.skilling@enron.com",
    "target": "bill.cordes@enron.com",
    "subject": "RE: Please Plan to Attend",
    "timestamp": 996699670000
  },
  {
    "source": "jeff.skilling@enron.com",
    "target": "akhoja@enron.com",
    "subject": "A/A Website",
    "timestamp": 948976620000
  },
  {
    "source": "jeff.skilling@enron.com",
    "target": "dconnal@enron.com",
    "subject": "A/A Website",
    "timestamp": 948976620000
  },
  {
    "source": "jeff.skilling@enron.com",
    "target": "louise.kitchen@enron.com",
    "subject": "RE: Please Plan to Attend",
    "timestamp": 996699670000
  },
  {
    "source": "jeff.skilling@enron.com",
    "target": "aborgatt@azurix.com",
    "subject": "A/A Website",
    "timestamp": 948976620000
  },
  {
    "source": "jeff.skilling@enron.com",
    "target": "j..kean@enron.com",
    "subject": "RE: Please Plan to Attend",
    "timestamp": 996699670000
  },
  {
    "source": "jeff.skilling@enron.com",
    "target": "mbaker2@enron.com",
    "subject": "A/A Website",
    "timestamp": 948976620000
  },
  {
    "source": "jeff.skilling@enron.com",
    "target": "steven.kean@enron.com",
    "subject": "",
    "timestamp": 987736680000
  },
  {
    "source": "jeff.skilling@enron.com",
    "target": "feliciag@marcusevanstx.com",
    "subject": "Re: Invitation to address UTILITIES 2001",
    "timestamp": 989440440000
  },
  {
    "source": "jeff.skilling@enron.com",
    "target": "mvasque@enron.com",
    "subject": "A/A Website",
    "timestamp": 948976620000
  },
  {
    "source": "torrey.moorer@enron.com",
    "target": "louise.kitchen@enron.com",
    "subject": "RE: EOL Average Deal Count as of 3-14-01",
    "timestamp": 984678480000
  },
  {
    "source": "louise.kitchen@enron.com",
    "target": "j..kean@enron.com",
    "subject": "",
    "timestamp": 1007392487000
  },
  {
    "source": "louise.kitchen@enron.com",
    "target": "d..steffes@enron.com",
    "subject": "RE: Eddy Daniels",
    "timestamp": 1012786341000
  },
  {
    "source": "louise.kitchen@enron.com",
    "target": "steven.kean@enron.com",
    "subject": "Names of potential speakers",
    "timestamp": 965380740000
  },
  {
    "source": "louise.kitchen@enron.com",
    "target": "kenneth.lay@enron.com",
    "subject": "",
    "timestamp": 1006909853000
  },
  {
    "source": "louise.kitchen@enron.com",
    "target": "jeff.skilling@enron.com",
    "subject": "EnronOnline Management Report 3-21-2000",
    "timestamp": 953836920000
  },
  {
    "source": "louise.kitchen@enron.com",
    "target": "julie.ferrara@enron.com",
    "subject": "Re: Slide",
    "timestamp": 965399640000
  }
].map((edge) => ({ id: `${edge.source}::${edge.target}`, source: edge.source, target: edge.target, label: edge.subject }))

const hierarchyData = hierarchy('jeff.skilling@enron.com', { nodes: hierarchyNodes, edges: hierarchyEdges })

window.trellisData = { simple: simpleData, hierarchy: hierarchyData }