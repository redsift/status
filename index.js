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

/* TODO: Remove this for now, not working
import { Scroll as Scroll } from '@redsift/ui-rs-core';
*/

import { 
  html as reveal, 
  checkSupported
} from "@redsift/d3-rs-reveal";

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

let imageReveal = reveal('svg-reveal')
                    .placeholder(placeholder)
                    .imgWidth(imgWidth)
                    .imgHeight(imgHeight)
                    .img(checkSupported.then(i => `./hero${i.retina ? '_2x' : ''}.${i.webp ? 'webp' : 'jpg'}`))
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
    console.error(`Unable to load status information`, err.stack ? err.stack : err); // eslint-disable-line no-console
    summary(select('#summary'));
    messages(select('#messages'));
  });

  chartData.then(d => {
    charts(select('#charts'), d);
  })
  .catch(err => {
    console.error(`Unable to load chart information`, err.stack ? err.stack : err); // eslint-disable-line no-console
    charts(select('#charts'));
  });  
}

let initialStatusData = loadData(dataUrls.status);
let initialChartData = loadData(dataUrls.charts);

document.addEventListener('DOMContentLoaded', () => {
  /* TODO: Remove this for now, not working
  Scroll.initSmooth('#smooth', 0);
  */

  select('#logo').attr('src', logo);
  select('.hero').call(imageReveal);

  presentData(initialStatusData, initialChartData);
  setInterval(() => presentData(loadData(dataUrls.status), loadData(dataUrls.charts)), refresh);
});