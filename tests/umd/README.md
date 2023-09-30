```sh
npm run build
cp ./dist/index.umd.* ./tests/umd/
cd tests/umd/
python3 -m http.server 8000
```
