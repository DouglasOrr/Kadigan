# Kadigan

[![Build Status](https://travis-ci.org/DouglasOrr/Kadigan.svg?branch=master)](https://travis-ci.org/DouglasOrr/Kadigan)

Kadigan is a single-player RTS set in a dynamic world.

## Getting started

You can either use `npm` directly, or through the wrapper script `run` which just runs everything through a Docker image. To host the dev server at http://localhost:1234/index.html?scene=game&fog=false&debugai=true&aidifficulty=medium&map=std

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

## Reference

 - [Phaser API docs](https://photonstorm.github.io/phaser3-docs/)
 - [How to Really Make a Phaser Game from Scratch](https://www.youtube.com/watch?v=yo40OaolRs8)
