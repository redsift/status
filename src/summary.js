
import { 
  base64 as okIcon 
} from '../static/good.svg';

import { 
  base64 as warnIcon 
} from '../static/minor.svg';

import { 
  base64 as koIcon 
} from '../static/major.svg';



// status = 'good', 'major', 'minor'
export default function summary(node, summary) {
    let icon = null,
        text = 'Unable to load status information.',
        status = summary ? summary.status : null;

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