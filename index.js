// Export version for completeness
export {
  version
} from "./package.json";

import { 
  refresh,
  api as dataUrls 
} from "./configuration.json";

import { select, selectAll } from 'd3-selection';
import { json } from 'd3-request';
import { isoParse } from 'd3-time-format';

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

const WEBP_CHECK = new Promise(function (ok) {
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

const loadData = (url) => new Promise((ok, ko) => json(url, (err, data) => err == null ? ok(data) : ko(err)));

function updatedText(seconds) {
  if (seconds < 70) {
    if (seconds < 0) console.warn('Clock skew detected'); // eslint-disable-line no-console
    return 'Updated a moment ago';
  } else if (seconds < 3 * 60) {
    return 'Updated a few minutes ago';
  } else {
    console.warn(`Old data, last update was ${seconds} seconds ago`); // eslint-disable-line no-console
    return 'Updated a while ago';
  }
}

function presentData(statusData, chartData) {
  statusData.then(d => {
    selectAll('.content_separator').attr('class', `content_separator background--${d.summary.status}`);

    summary(select('#summary'), d.summary);
    messages(select('#messages'), d.messages);

    let age = (Date.now() - isoParse(d.summary.last_updated)) / 1000;
    let text = updatedText(age);

    select('.age').attr('title', `${age.toFixed(0)} seconds ago`).text(text);
  })
  .catch(err => {
    console.error(`Unable to load status information`, err); // eslint-disable-line no-console
    summary(select('#summary'));
    messages(select('#messages'));
  });

  chartData.then(d => {
    charts(select('#charts'), d);
  })
  .catch(err => {
    console.error(`Unable to load chart information`, err); // eslint-disable-line no-console
    charts(select('#charts'));
  });  
}

let initialStatusData = loadData(dataUrls.status);
let initialChartData = loadData(dataUrls.charts);

document.addEventListener('DOMContentLoaded', () => {
  Scroll.initSmooth('#smooth', 0);
  
  select('#logo').attr('src', logo);
  select('.hero').call(imageReveal);

  presentData(initialStatusData, initialChartData);
  setInterval(() => presentData(loadData(dataUrls.status), loadData(dataUrls.charts)), refresh);
});