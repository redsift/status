import { isoParse, timeFormatLocale } from 'd3-time-format';
import { nest } from 'd3-collection';
import { time } from '@redsift/d3-rs-intl';
import Showdown from 'showdown';

function iconFor(status) {
    if (status === 'good') {
      return '/good.svg';
    } else if (status === 'minor') {
      return '/minor.svg';
    } else if (status === 'major') {
      return '/major.svg';
    } else if (status === 'announcement') {
      return '/note.svg';
    }  
    return null;  
}

const converter = new Showdown.Converter();

export default function messages(node, messages) {

    if (messages == null) return;

    let parsed = messages.map(m => ({ status: m.status, body: m.body, created_on: isoParse(m.created_on) }));

    let localeTime = timeFormatLocale(time().d3);
    let headingDate = localeTime.format('%B %d, %Y');
    let entryTime = localeTime.format('%X');

    let nested = nest().key(m => headingDate(m.created_on)).entries(parsed);

    let bind = node.selectAll('div.day').data(nested);
    bind.exit().remove();
    let newBind = bind.enter().append('div').attr('class', 'day');
    newBind.append('h4');
    bind = newBind.merge(bind);

    bind.select('h4').text(d => d.key);
    let entries = bind.selectAll('div.entry').data(d => d.values);

    let newEntries = entries.enter().append('div').attr('class', 'entry');
    newEntries.append('code').attr('class', 'time');
    newEntries.append('img').attr('class', 'status');
    newEntries.append('div').attr('class', 'message');
    entries = newEntries.merge(entries);

    entries.select('code.time').text(d => entryTime(d.created_on));
    entries.select('img.status').attr('src', d => iconFor(d.status)).attr('alt', d => d.status);
    entries.select('div.message').html(d => converter.makeHtml(d.body));
}