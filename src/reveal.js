import { select } from 'd3-selection';
import { transition } from 'd3-transition';
import { easeCubicIn } from 'd3-ease';

import { html as svg } from '@redsift/d3-rs-svg';

const DEFAULT_MIN_LOAD_TIME = 66; // length of time needed before the component will trigger animations
const DEFAULT_ANIMATION_DURATION = 800;
const DEFAULT_EASE = easeCubicIn;


function revealFilter(id, defs, blur) {
    let filter = defs.select(id);
    if (filter.empty()) {
        filter = defs.append('filter').attr('id', id);
        filter.append('feGaussianBlur');
        let c = filter.append('feComponentTransfer');
        c.append('feFuncR');
        c.append('feFuncG');
        c.append('feFuncB');
        c.append('feFuncA');
    }

    filter.attr('filterUnits', 'objectBoundingBox').attr('x', '0%').attr('y', '0%').attr('width', '100%').attr('height', '100%');
    filter.select('feFuncR').attr('type', 'linear').attr('slope', 2);
    filter.select('feFuncG').attr('type', 'linear').attr('slope', 2);
    filter.select('feFuncB').attr('type', 'linear').attr('slope', 2);
    filter.select('feFuncA').attr('type', 'discrete').attr('tableValues', '1 1');

    return filter.select('feGaussianBlur').attr('stdDeviation', blur);
}

export default function reveal(id) {
    let classed = 'chart-reveal',
        ease = DEFAULT_EASE,
        duration = DEFAULT_ANIMATION_DURATION,
        minLoadTime = DEFAULT_MIN_LOAD_TIME,
        imgHeight = 0,
        imgWidth = 0,
        strength = 12,
        width = '100%',
        height = '100%',        
        img = null,
        placeholder = null,
        background = 'red',
        filterReveal = 'flt-reveal';

    function _impl(context) {
        
        let selection = context.selection ? context.selection() : context;

        let offset = 2 * strength,
            w = imgWidth + 2 * offset,
            h = imgHeight + 2 * offset;

        selection.each(function() {
            let node = select(this);  

            let root = svg(id).classed(classed).width(imgWidth).height(imgHeight).margin(0).scale(1.0).background(background);
            let svgNode = node.call(root).select(root.self());
            svgNode.attr('width', width).attr('height', height).attr('preserveAspectRatio', 'xMidYMid slice');

            let blur = revealFilter(filterReveal, svgNode.select('defs'), strength);

            let g = svgNode.select(root.child());

            let o = g.select('image.original');
            if (o.empty()) {
                o = g.append('image').attr('class', 'original');
            }

            let p = g.select('image.preview');
            if (p.empty()) {
                p = g.append('image').attr('class', 'preview');
            }
            p.attr('xlink:href', placeholder)
                .attr('x', -offset)
                .attr('y', -offset)
                .attr('width', w)
                .attr('height', h)
                .attr('opacity', 1.0)
                .attr('filter', `url(#${filterReveal})`);

            let start = Date.now(); // start time timer to establish the amount of time taken to load the real image

            function replace(s) {
                let time = Date.now() - start;

                if (p.empty()) return; // No preview layer, noop

                if (time < minLoadTime) {
                    // image was ready under the threshold. Dno't make the user sit through an animation
                    p.remove();
                } else {
                    let t = transition()
                        .delay(s === undefined ? 0 : 33) // if this was called by a workaround, start this on the next tick
                        .duration(duration)
                        .ease(ease);

                    blur.transition(t).attr('stdDeviation', 0); // Animate away the blur function      

                    p.transition(t)
                            .attrTween('opacity', () => (t) => 1.0 - t) // Animate away the overlay as part of the same transition
                        .remove();
                }
            }

            Promise.resolve(img).then(function (url) {
                o.attr('xlink:href', url)
                    .attr('x', -offset).attr('y', -offset).attr('width', w).attr('height', h)
                    .on('load', replace); // Note: this does not get fired on browsers that do not emit this event e.g. Safari

                // While we don't want to be doing this, Safari as of 9.0.1 does not emit
                // an onload event for SVG <image> tags
                let isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
                if (isSafari) {
                    let image = new Image(); // Use an Image object where onload works
                    image.onload = function () {
                        replace('safariWorkaround');
                    }
                    image.src = url;  
                }   
            });
        });
   }
  _impl.self = () => `svg${id ?  '#' + id : '.' + classed}`;

  _impl.id = () => id;

  _impl.classed = function(value) {
    return arguments.length ? (classed = value, _impl) : classed;
  };
  
  _impl.width = function(value) {
    return arguments.length ? (width = value, _impl) : width;
  };  

  _impl.height = function(value) {
    return arguments.length ? (height = value, _impl) : height;
  }; 

  _impl.background = function(value) {
    return arguments.length ? (background = value, _impl) : background;
  }; 

  _impl.placeholder = function(value) {
    return arguments.length ? (placeholder = value, _impl) : placeholder;
  }; 

  _impl.strength = function(value) {
    return arguments.length ? (strength = value, _impl) : strength;
  }; 

  _impl.img = function(value) {
    return arguments.length ? (img = value, _impl) : img;
  }; 

  _impl.imgWidth = function(value) {
    return arguments.length ? (imgWidth = value, _impl) : imgWidth;
  }; 

  _impl.imgHeight = function(value) {
    return arguments.length ? (imgHeight = value, _impl) : imgHeight;
  }; 

  _impl.ease = function(value) {
    return arguments.length ? (ease = value, _impl) : ease;
  };   
  
  _impl.duration = function(value) {
    return arguments.length ? (duration = value, _impl) : duration;
  };   

  _impl.minLoadTime = function(value) {
    return arguments.length ? (minLoadTime = value, _impl) : minLoadTime;
  };   
                
  return _impl;    
}