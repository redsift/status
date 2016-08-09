// Export version for completeness
export {
  version
} from "./package.json";

import { 
  refresh,
  data as dataUrl 
} from "./configuration.json";

import { select } from "d3-selection";
import { json } from "d3-request"

export const d3 = {
  select: select
};

import { Scroll as Scroll } from '@redsift/ui-rs-core';

import { 
  base64 as placeholder 
} from './static/hero_0x.jpg';

import { 
  width as imgWidth,
  height as imgHeight
} from './static/hero.jpg';

import { base64 as logo } from './static/logo.svg';

// Import the chart app
import summary from "./src/summary";
import messages from "./src/messages";
import charts from "./src/charts";

import reveal from "./src/reveal";

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

let imageReveal = reveal('svg-reveal')
                    .placeholder(placeholder)
                    .imgWidth(imgWidth)
                    .imgHeight(imgHeight)
                    .img(IMAGE_CHECK.then(i => `./hero${i.retina ? '_2x' : ''}.${i.webp ? 'webp' : 'jpg'}`))
                    .classed('background');

const loadStatusData = () => new Promise((ok, ko) => json(dataUrl, (err, data) => err == null ? ok(data) : ko(err)));

function presentData(statusData) {
  statusData.then(d => {
    summary(select('#summary'), d.summary);
    messages(select('#messages'), d.messages);
    charts(select('#charts'), d.charts);
  })
  .catch(err => {
    console.error(`Unable to load status information from ${dataUrl}`, err);
    summary(select('#summary'));
    messages(select('#messages'));
    charts(select('#charts'));
  })
}

let initialStatusData = loadStatusData();

document.addEventListener('DOMContentLoaded', () => {
  Scroll.initSmooth('#smooth', 0);
  
  select('#logo').attr('src', logo);
  select('.hero').call(imageReveal);

  presentData(initialStatusData);
  setInterval(() => presentData(loadStatusData()), refresh);
});