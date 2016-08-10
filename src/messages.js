import { isoParse, timeFormat } from 'd3-time-format';
import { nest } from 'd3-collection';

function iconFor(status) {
    if (status === 'good') {
      return '/good.svg';
    } else if (status === 'minor') {
      return '/minor.svg';
    } else if (status === 'major') {
      return '/major.svg';
    }  
    return null;  
}

export default function messages(node, messages) {
    // list of messages    

    if (messages == null) return;

    let parsed = messages.map(m => ({ status: m.status, body: m.body, created_on: isoParse(m.created_on) }));

    let headingDate = timeFormat('%B %d, %Y');
    let entryTime = timeFormat('%X');

    let nested = nest().key(m => headingDate(m.created_on)).entries(parsed);

    let bind = node.selectAll('div.day').data(nested);
    bind.exit().remove();
    let newBind = bind.enter().append('div').attr('class', 'day');
    newBind.append('h4');
    bind = newBind.merge(bind);

    bind.select('h4').text(d => d.key);
    let entries = bind.selectAll('div.entry').data(d => d.values);

    let newEntries = entries.enter().append('div').attr('class', 'entry');
    newEntries.append('div').attr('class', 'time');
    newEntries.append('img').attr('class', 'status');
    newEntries.append('div').attr('class', 'message');
    entries = newEntries.merge(entries);

    entries.select('div.time').text(d => entryTime(d.created_on));
    entries.select('img.status').attr('src', d => iconFor(d.status)).attr('alt', d => d.status);
    entries.select('div.message').text(d => d.body);

    console.log(parsed, nested);
}