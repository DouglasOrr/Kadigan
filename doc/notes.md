# Development notes

## Bitmap fonts

 - Find a good ttf font
 - Use [bmfont](http://www.angelcode.com/products/bmfont/) (under Wine in Linux)
 - Select a subset of the characters (first few rows)
 - In "Export Options", use a 32-bit texture & select the preset "White text with alpha"
 - Change file format to "xml" and textures to "png"
 - Save & rename ".fnt" => ".xml"

## GLSL

 - VSCode extension "GLSL Lint"
 - `apt install glslang-tools`

## Releasing

Run `./run release` and find the zipped bundle in `release/`.
