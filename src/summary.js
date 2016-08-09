import { isoParse } from 'd3-time-format';

import { 
  base64 as okIcon 
} from '../static/good.svg';

import { 
  base64 as warnIcon 
} from '../static/minor.svg';

import { 
  base64 as koIcon 
} from '../static/major.svg';

function updatedText(seconds) {
  if (seconds < 30) {
    if (seconds < 0) console.log('Clock skew detected');
    return 'Updated a moment ago';
  } else if (seconds < 2 * 60) {
    return 'Updated a few minutes ago';
  } else {
    console.log(`Old data, last update was ${seconds} seconds ago`);
    return 'Updated a while ago';
  }
}

// status = 'good', 'major', 'minor'
export default function summary(node, summary) {
    let icon = null,
        text = 'Unable to load status information.',
        status = null,
        updated = null;
    
    if (summary) {
      status = summary.status;
      updated = updatedText((Date.now() - isoParse(summary.last_updated)) / 1000);
    }

    console.log(updated);

    if (status === 'good') {
      icon = okIcon;
      text = 'All systems operational.';
    } else if (status === 'minor') {
      icon = warnIcon;
      text = 'Partial outage.';
    } else if (status === 'major') {
      icon = koIcon;
      text = 'We are offline.';
    }

    node.select('img.status')
        .attr('style', null)
        .attr('src', icon)
        .attr('alt', icon != null ? text : '')
        .classed('fade-in', true);

    node.select('p.status')
        .attr('style', null)
        .text(text)
        .classed('fade-in', true)
        .classed('delay', true);
}