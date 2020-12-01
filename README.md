# Kadigan

[![Build Status](https://travis-ci.org/DouglasOrr/Kadigan.svg?branch=master)](https://travis-ci.org/DouglasOrr/Kadigan)

Kadigan is a single-player RTS set in a dynamic world.

## Getting started

To host the dev server at http://localhost:1234/index.html?scene=game&fog=false&debugai=true&aidifficulty=medium&map=std

```bash
./run build
./run start
```

Checks `./run check` or for continuous typecheck & tests:

```bash
./run tsc -w
./run test -w
```

This might also be useful sometimes:

```bash
git diff --cached -- ':!package-lock.json'
```

## References

 - [Phaser API docs](https://photonstorm.github.io/phaser3-docs/)
 - [Jest API docs](https://jestjs.io/docs/en/api)
 - [How to Really Make a Phaser Game from Scratch](https://www.youtube.com/watch?v=yo40OaolRs8)

## Releasing

```
rm -r dist
./run npm run build
cd dist && zip -r "../releases/Kadigan_$(date --iso)-v0.zip" .
```
