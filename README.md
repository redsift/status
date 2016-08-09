# Status

[![Circle CI](https://img.shields.io/circleci/project/redsift/status.svg?style=flat-square)](https://circleci.com/gh/redsift/status)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://raw.githubusercontent.com/redsift/status/master/LICENSE)

Super simple, completely static, status pages.

## ImageMagick

The build process transcodes and embeds images to optimize display of images, including exporting WEBP images to be loaded in compatible browsers. Build relies on a compatible install of ImageMagick in the path. Specifically, the insalled version should support SVG, WEBP and have Little CMS support.

### OS-X & Homebrew

```bash
$ brew reinstall imagemagick --with-webp --with-little-cms2 --with-librsvg
```

## S3 Assets

If using assets on S3 that are not world readable

AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... npm run serve
