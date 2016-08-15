import { html as graph, timeMultiFormat } from '@redsift/d3-rs-lines';
import { format } from "d3-format"
import { select } from 'd3-selection';

import { presentation10 } from '@redsift/d3-rs-theme';

export default function charts(node, charts) {
    if (charts == null) return;
    
    // TODO: Currently limited to the day
    let chart = charts.week;

    let fmt = chart.map(d => format(d.format));
    let valueFormat = (d,i,v) => `${d.prefix ? d.prefix : ''}${fmt[i](v)}${d.suffix ? d.suffix : ''}`;

    let bind = node.selectAll('div.chart').data(chart);
    bind.exit().remove();
    let newBind = bind.enter().append('div').attr('class', 'chart');
    let value = newBind.append('div').attr('class', 'panel-left');
    value.append('h5');
    value.append('code');

    newBind.append('div').attr('class', 'panel-right');

    bind = bind.merge(newBind);

    bind.select('h5').text(d => d.display);
    bind.select('code').text((d, i) => valueFormat(d, i, d.data[d.data.length - 1].v));

    let fill = presentation10.standard[presentation10.names.blue];

    bind.select('.panel-right').each(function (d,i) {
        let viz = graph(`graph-${i}`)
                        .labelTime(timeMultiFormat({ localtime: true }))
                        .curve('curveMonotoneX')
                        .tickFormatValue(d.format)
                        .tickCountIndex(4)
                        .niceIndex(false)
                        .fill(fill);
                        
        if (d.minor) {
            viz = viz.tickMinorIndex(d.minor);
        }
        select(this).datum(d.data).call(viz);
    });
}