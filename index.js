// Export version for completeness
export {
  version
} from "./package.json";

// Register the hero presentation
//import _ from "@redsift/ui-rs-hero";

import placeholder from './static/hero_i.jpg';

import logo from './static/redsift-logo-white.svg';

// Import the chart app
import charts from "./src/charts";
import reveal from "./src/reveal";
import { select } from "d3-selection";

export const d3 = {
  select: select
};

charts();

const WEBP_TEST_LOSSY = "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";

const WEBP_CHECK = new Promise(function (ok, ko) {
    let img = new Image();
    img.onload = function() {
        ok(img.width > 0 && img.height > 0);
    };
    img.onerror = function() {
        ok(false);
    };
    img.src = "data:image/webp;base64," + WEBP_TEST_LOSSY;
});

const IMAGE_CHECK = WEBP_CHECK.then((webp) => {
  let retina = window.devicePixelRatio > 1;

  return { webp: webp, retina: retina};
});

// let img = 'https://static.redsift.io/assets/images/beach_2x.jpg';
// console.log(placeholder);
let imageReveal = reveal('svg-reveal')
                    .placeholder(placeholder.data)
                    .imgWidth(placeholder.width)
                    .imgHeight(placeholder.height)
                    .img(IMAGE_CHECK.then(i => `./hero${i.retina ? '_2x' : ''}.${i.webp ? 'webp' : 'jpg'}`))
                    .classed('background');

select('.hero').call(imageReveal);

select('#logo').attr('src', logo.data);
