# Unnamed game

[![Build Status](https://travis-ci.org/DouglasOrr/UnnamedGame.svg?branch=master)](https://travis-ci.org/DouglasOrr/UnnamedGame)

## Getting started

To host the dev server at http://localhost:1234/?scene=game&pointerpan=false&fog=false&debugai=true

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
