/* eslint-disable no-useless-escape */
import { forceSimulation, forceManyBody, forceCenter, forceLink, forceCollide, forceRadial, forceX, forceY, SimulationLinkDatum, SimulationNodeDatum } from 'd3-force'
import { Node, Edge, Extend } from '../../types'


export type LayoutOptions = {
  nodeStrength: number
  linkDistance: number
  linkStrength?: number
  centerStrength: number
  nodePadding: number
  tick: number
}

declare const d3: {
  forceSimulation: typeof forceSimulation
  forceManyBody: typeof forceManyBody
  forceCenter: typeof forceCenter
  forceLink: typeof forceLink
  forceCollide: typeof forceCollide
  forceRadial: typeof forceRadial
  forceX: typeof forceX
  forceY: typeof forceY
}

declare const self: Worker

type SimulationNode = {
  id: string
  radius: number
} & SimulationNodeDatum

type Message<T> = { data: T }

type LayoutEvent = {
  v: number
  nodes: Node[]
  edges: Edge[]
  options?: Partial<LayoutOptions>
}

type LayoutResultEvent<N extends Node<E>, E extends Edge> = {
  v: number
  nodes: Extend<N, { x: number, y: number }>[]
}


export const LAYOUT_OPTIONS: LayoutOptions = {
  nodeStrength: -600,
  linkDistance: 300,
  linkStrength: undefined,
  centerStrength: 0.01,
  nodePadding: 8,
  tick: 300,
}


const d3ForceScript = `
// https://d3js.org/d3-dispatch/ v1.0.5 Copyright 2018 Mike Bostock
!function(n,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports):"function"==typeof define&&define.amd?define(["exports"],e):e(n.d3=n.d3||{})}(this,function(n){"use strict";var e={value:function(){}};function t(){for(var n,e=0,t=arguments.length,o={};e<t;++e){if(!(n=arguments[e]+"")||n in o)throw new Error("illegal type: "+n);o[n]=[]}return new r(o)}function r(n){this._=n}function o(n,e){for(var t,r=0,o=n.length;r<o;++r)if((t=n[r]).name===e)return t.value}function i(n,t,r){for(var o=0,i=n.length;o<i;++o)if(n[o].name===t){n[o]=e,n=n.slice(0,o).concat(n.slice(o+1));break}return null!=r&&n.push({name:t,value:r}),n}r.prototype=t.prototype={constructor:r,on:function(n,e){var t,r,f=this._,l=(r=f,(n+"").trim().split(/^|\s+/).map(function(n){var e="",t=n.indexOf(".");if(t>=0&&(e=n.slice(t+1),n=n.slice(0,t)),n&&!r.hasOwnProperty(n))throw new Error("unknown type: "+n);return{type:n,name:e}})),a=-1,u=l.length;if(!(arguments.length<2)){if(null!=e&&"function"!=typeof e)throw new Error("invalid callback: "+e);for(;++a<u;)if(t=(n=l[a]).type)f[t]=i(f[t],n.name,e);else if(null==e)for(t in f)f[t]=i(f[t],n.name,null);return this}for(;++a<u;)if((t=(n=l[a]).type)&&(t=o(f[t],n.name)))return t},copy:function(){var n={},e=this._;for(var t in e)n[t]=e[t].slice();return new r(n)},call:function(n,e){if((t=arguments.length-2)>0)for(var t,r,o=new Array(t),i=0;i<t;++i)o[i]=arguments[i+2];if(!this._.hasOwnProperty(n))throw new Error("unknown type: "+n);for(i=0,t=(r=this._[n]).length;i<t;++i)r[i].value.apply(e,o)},apply:function(n,e,t){if(!this._.hasOwnProperty(n))throw new Error("unknown type: "+n);for(var r=this._[n],o=0,i=r.length;o<i;++o)r[o].value.apply(e,t)}},n.dispatch=t,Object.defineProperty(n,"__esModule",{value:!0})});
// https://d3js.org/d3-quadtree/ v1.0.6 Copyright 2019 Mike Bostock
!function(t,i){"object"==typeof exports&&"undefined"!=typeof module?i(exports):"function"==typeof define&&define.amd?define(["exports"],i):i(t.d3=t.d3||{})}(this,function(t){"use strict";function i(t,i,r,n){if(isNaN(i)||isNaN(r))return t;var e,s,h,o,a,u,l,_,f,c=t._root,x={data:n},y=t._x0,d=t._y0,v=t._x1,p=t._y1;if(!c)return t._root=x,t;for(;c.length;)if((u=i>=(s=(y+v)/2))?y=s:v=s,(l=r>=(h=(d+p)/2))?d=h:p=h,e=c,!(c=c[_=l<<1|u]))return e[_]=x,t;if(o=+t._x.call(null,c.data),a=+t._y.call(null,c.data),i===o&&r===a)return x.next=c,e?e[_]=x:t._root=x,t;do{e=e?e[_]=new Array(4):t._root=new Array(4),(u=i>=(s=(y+v)/2))?y=s:v=s,(l=r>=(h=(d+p)/2))?d=h:p=h}while((_=l<<1|u)==(f=(a>=h)<<1|o>=s));return e[f]=c,e[_]=x,t}function r(t,i,r,n,e){this.node=t,this.x0=i,this.y0=r,this.x1=n,this.y1=e}function n(t){return t[0]}function e(t){return t[1]}function s(t,i,r){var s=new h(null==i?n:i,null==r?e:r,NaN,NaN,NaN,NaN);return null==t?s:s.addAll(t)}function h(t,i,r,n,e,s){this._x=t,this._y=i,this._x0=r,this._y0=n,this._x1=e,this._y1=s,this._root=void 0}function o(t){for(var i={data:t.data},r=i;t=t.next;)r=r.next={data:t.data};return i}var a=s.prototype=h.prototype;a.copy=function(){var t,i,r=new h(this._x,this._y,this._x0,this._y0,this._x1,this._y1),n=this._root;if(!n)return r;if(!n.length)return r._root=o(n),r;for(t=[{source:n,target:r._root=new Array(4)}];n=t.pop();)for(var e=0;e<4;++e)(i=n.source[e])&&(i.length?t.push({source:i,target:n.target[e]=new Array(4)}):n.target[e]=o(i));return r},a.add=function(t){var r=+this._x.call(null,t),n=+this._y.call(null,t);return i(this.cover(r,n),r,n,t)},a.addAll=function(t){var r,n,e,s,h=t.length,o=new Array(h),a=new Array(h),u=1/0,l=1/0,_=-1/0,f=-1/0;for(n=0;n<h;++n)isNaN(e=+this._x.call(null,r=t[n]))||isNaN(s=+this._y.call(null,r))||(o[n]=e,a[n]=s,e<u&&(u=e),e>_&&(_=e),s<l&&(l=s),s>f&&(f=s));if(u>_||l>f)return this;for(this.cover(u,l).cover(_,f),n=0;n<h;++n)i(this,o[n],a[n],t[n]);return this},a.cover=function(t,i){if(isNaN(t=+t)||isNaN(i=+i))return this;var r=this._x0,n=this._y0,e=this._x1,s=this._y1;if(isNaN(r))e=(r=Math.floor(t))+1,s=(n=Math.floor(i))+1;else{for(var h,o,a=e-r,u=this._root;r>t||t>=e||n>i||i>=s;)switch(o=(i<n)<<1|t<r,(h=new Array(4))[o]=u,u=h,a*=2,o){case 0:e=r+a,s=n+a;break;case 1:r=e-a,s=n+a;break;case 2:e=r+a,n=s-a;break;case 3:r=e-a,n=s-a}this._root&&this._root.length&&(this._root=u)}return this._x0=r,this._y0=n,this._x1=e,this._y1=s,this},a.data=function(){var t=[];return this.visit(function(i){if(!i.length)do{t.push(i.data)}while(i=i.next)}),t},a.extent=function(t){return arguments.length?this.cover(+t[0][0],+t[0][1]).cover(+t[1][0],+t[1][1]):isNaN(this._x0)?void 0:[[this._x0,this._y0],[this._x1,this._y1]]},a.find=function(t,i,n){var e,s,h,o,a,u,l,_=this._x0,f=this._y0,c=this._x1,x=this._y1,y=[],d=this._root;for(d&&y.push(new r(d,_,f,c,x)),null==n?n=1/0:(_=t-n,f=i-n,c=t+n,x=i+n,n*=n);u=y.pop();)if(!(!(d=u.node)||(s=u.x0)>c||(h=u.y0)>x||(o=u.x1)<_||(a=u.y1)<f))if(d.length){var v=(s+o)/2,p=(h+a)/2;y.push(new r(d[3],v,p,o,a),new r(d[2],s,p,v,a),new r(d[1],v,h,o,p),new r(d[0],s,h,v,p)),(l=(i>=p)<<1|t>=v)&&(u=y[y.length-1],y[y.length-1]=y[y.length-1-l],y[y.length-1-l]=u)}else{var w=t-+this._x.call(null,d.data),N=i-+this._y.call(null,d.data),g=w*w+N*N;if(g<n){var A=Math.sqrt(n=g);_=t-A,f=i-A,c=t+A,x=i+A,e=d.data}}return e},a.remove=function(t){if(isNaN(s=+this._x.call(null,t))||isNaN(h=+this._y.call(null,t)))return this;var i,r,n,e,s,h,o,a,u,l,_,f,c=this._root,x=this._x0,y=this._y0,d=this._x1,v=this._y1;if(!c)return this;if(c.length)for(;;){if((u=s>=(o=(x+d)/2))?x=o:d=o,(l=h>=(a=(y+v)/2))?y=a:v=a,i=c,!(c=c[_=l<<1|u]))return this;if(!c.length)break;(i[_+1&3]||i[_+2&3]||i[_+3&3])&&(r=i,f=_)}for(;c.data!==t;)if(n=c,!(c=c.next))return this;return(e=c.next)&&delete c.next,n?(e?n.next=e:delete n.next,this):i?(e?i[_]=e:delete i[_],(c=i[0]||i[1]||i[2]||i[3])&&c===(i[3]||i[2]||i[1]||i[0])&&!c.length&&(r?r[f]=c:this._root=c),this):(this._root=e,this)},a.removeAll=function(t){for(var i=0,r=t.length;i<r;++i)this.remove(t[i]);return this},a.root=function(){return this._root},a.size=function(){var t=0;return this.visit(function(i){if(!i.length)do{++t}while(i=i.next)}),t},a.visit=function(t){var i,n,e,s,h,o,a=[],u=this._root;for(u&&a.push(new r(u,this._x0,this._y0,this._x1,this._y1));i=a.pop();)if(!t(u=i.node,e=i.x0,s=i.y0,h=i.x1,o=i.y1)&&u.length){var l=(e+h)/2,_=(s+o)/2;(n=u[3])&&a.push(new r(n,l,_,h,o)),(n=u[2])&&a.push(new r(n,e,_,l,o)),(n=u[1])&&a.push(new r(n,l,s,h,_)),(n=u[0])&&a.push(new r(n,e,s,l,_))}return this},a.visitAfter=function(t){var i,n=[],e=[];for(this._root&&n.push(new r(this._root,this._x0,this._y0,this._x1,this._y1));i=n.pop();){var s=i.node;if(s.length){var h,o=i.x0,a=i.y0,u=i.x1,l=i.y1,_=(o+u)/2,f=(a+l)/2;(h=s[0])&&n.push(new r(h,o,a,_,f)),(h=s[1])&&n.push(new r(h,_,a,u,f)),(h=s[2])&&n.push(new r(h,o,f,_,l)),(h=s[3])&&n.push(new r(h,_,f,u,l))}e.push(i)}for(;i=e.pop();)t(i.node,i.x0,i.y0,i.x1,i.y1);return this},a.x=function(t){return arguments.length?(this._x=t,this):this._x},a.y=function(t){return arguments.length?(this._y=t,this):this._y},t.quadtree=s,Object.defineProperty(t,"__esModule",{value:!0})});
// https://d3js.org/d3-timer/ v1.0.9 Copyright 2018 Mike Bostock
!function(t,n){"object"==typeof exports&&"undefined"!=typeof module?n(exports):"function"==typeof define&&define.amd?define(["exports"],n):n(t.d3=t.d3||{})}(this,function(t){"use strict";var n,e,o=0,i=0,r=0,u=1e3,l=0,c=0,a=0,f="object"==typeof performance&&performance.now?performance:Date,s="object"==typeof window&&window.requestAnimationFrame?window.requestAnimationFrame.bind(window):function(t){setTimeout(t,17)};function _(){return c||(s(m),c=f.now()+a)}function m(){c=0}function p(){this._call=this._time=this._next=null}function w(t,n,e){var o=new p;return o.restart(t,n,e),o}function d(){_(),++o;for(var t,e=n;e;)(t=c-e._time)>=0&&e._call.call(null,t),e=e._next;--o}function h(){c=(l=f.now())+a,o=i=0;try{d()}finally{o=0,function(){var t,o,i=n,r=1/0;for(;i;)i._call?(r>i._time&&(r=i._time),t=i,i=i._next):(o=i._next,i._next=null,i=t?t._next=o:n=o);e=t,v(r)}(),c=0}}function y(){var t=f.now(),n=t-l;n>u&&(a-=n,l=t)}function v(t){o||(i&&(i=clearTimeout(i)),t-c>24?(t<1/0&&(i=setTimeout(h,t-f.now()-a)),r&&(r=clearInterval(r))):(r||(l=f.now(),r=setInterval(y,u)),o=1,s(h)))}p.prototype=w.prototype={constructor:p,restart:function(t,o,i){if("function"!=typeof t)throw new TypeError("callback is not a function");i=(null==i?_():+i)+(null==o?0:+o),this._next||e===this||(e?e._next=this:n=this,e=this),this._call=t,this._time=i,v()},stop:function(){this._call&&(this._call=null,this._time=1/0,v())}},t.now=_,t.timer=w,t.timerFlush=d,t.timeout=function(t,n,e){var o=new p;return n=null==n?0:+n,o.restart(function(e){o.stop(),t(e+n)},n,e),o},t.interval=function(t,n,e){var o=new p,i=n;return null==n?(o.restart(t,n,e),o):(n=+n,e=null==e?_():+e,o.restart(function r(u){u+=i,o.restart(r,i+=n,e),t(u)},n,e),o)},Object.defineProperty(t,"__esModule",{value:!0})});
// https://d3js.org/d3-force/ v2.0.1 Copyright 2019 Mike Bostock
!function(n,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports,require("d3-quadtree"),require("d3-dispatch"),require("d3-timer")):"function"==typeof define&&define.amd?define(["exports","d3-quadtree","d3-dispatch","d3-timer"],t):t(n.d3=n.d3||{},n.d3,n.d3,n.d3)}(this,function(n,t,r,e){"use strict";function i(n){return function(){return n}}function u(){return 1e-6*(Math.random()-.5)}function o(n){return n.x+n.vx}function f(n){return n.y+n.vy}function a(n){return n.index}function c(n,t){var r=n.get(t);if(!r)throw new Error("missing: "+t);return r}function l(n){return n.x}function h(n){return n.y}var v=10,y=Math.PI*(3-Math.sqrt(5));n.forceCenter=function(n,t){var r;function e(){var e,i,u=r.length,o=0,f=0;for(e=0;e<u;++e)o+=(i=r[e]).x,f+=i.y;for(o=o/u-n,f=f/u-t,e=0;e<u;++e)(i=r[e]).x-=o,i.y-=f}return null==n&&(n=0),null==t&&(t=0),e.initialize=function(n){r=n},e.x=function(t){return arguments.length?(n=+t,e):n},e.y=function(n){return arguments.length?(t=+n,e):t},e},n.forceCollide=function(n){var r,e,a=1,c=1;function l(){for(var n,i,l,v,y,d,x,g=r.length,s=0;s<c;++s)for(i=t.quadtree(r,o,f).visitAfter(h),n=0;n<g;++n)l=r[n],d=e[l.index],x=d*d,v=l.x+l.vx,y=l.y+l.vy,i.visit(p);function p(n,t,r,e,i){var o=n.data,f=n.r,c=d+f;if(!o)return t>v+c||e<v-c||r>y+c||i<y-c;if(o.index>l.index){var h=v-o.x-o.vx,g=y-o.y-o.vy,s=h*h+g*g;s<c*c&&(0===h&&(s+=(h=u())*h),0===g&&(s+=(g=u())*g),s=(c-(s=Math.sqrt(s)))/s*a,l.vx+=(h*=s)*(c=(f*=f)/(x+f)),l.vy+=(g*=s)*c,o.vx-=h*(c=1-c),o.vy-=g*c)}}}function h(n){if(n.data)return n.r=e[n.data.index];for(var t=n.r=0;t<4;++t)n[t]&&n[t].r>n.r&&(n.r=n[t].r)}function v(){if(r){var t,i,u=r.length;for(e=new Array(u),t=0;t<u;++t)i=r[t],e[i.index]=+n(i,t,r)}}return"function"!=typeof n&&(n=i(null==n?1:+n)),l.initialize=function(n){r=n,v()},l.iterations=function(n){return arguments.length?(c=+n,l):c},l.strength=function(n){return arguments.length?(a=+n,l):a},l.radius=function(t){return arguments.length?(n="function"==typeof t?t:i(+t),v(),l):n},l},n.forceLink=function(n){var t,r,e,o,f,l=a,h=function(n){return 1/Math.min(o[n.source.index],o[n.target.index])},v=i(30),y=1;function d(e){for(var i=0,o=n.length;i<y;++i)for(var a,c,l,h,v,d,x,g=0;g<o;++g)c=(a=n[g]).source,h=(l=a.target).x+l.vx-c.x-c.vx||u(),v=l.y+l.vy-c.y-c.vy||u(),h*=d=((d=Math.sqrt(h*h+v*v))-r[g])/d*e*t[g],v*=d,l.vx-=h*(x=f[g]),l.vy-=v*x,c.vx+=h*(x=1-x),c.vy+=v*x}function x(){if(e){var i,u,a=e.length,h=n.length,v=new Map(e.map((n,t)=>[l(n,t,e),n]));for(i=0,o=new Array(a);i<h;++i)(u=n[i]).index=i,"object"!=typeof u.source&&(u.source=c(v,u.source)),"object"!=typeof u.target&&(u.target=c(v,u.target)),o[u.source.index]=(o[u.source.index]||0)+1,o[u.target.index]=(o[u.target.index]||0)+1;for(i=0,f=new Array(h);i<h;++i)u=n[i],f[i]=o[u.source.index]/(o[u.source.index]+o[u.target.index]);t=new Array(h),g(),r=new Array(h),s()}}function g(){if(e)for(var r=0,i=n.length;r<i;++r)t[r]=+h(n[r],r,n)}function s(){if(e)for(var t=0,i=n.length;t<i;++t)r[t]=+v(n[t],t,n)}return null==n&&(n=[]),d.initialize=function(n){e=n,x()},d.links=function(t){return arguments.length?(n=t,x(),d):n},d.id=function(n){return arguments.length?(l=n,d):l},d.iterations=function(n){return arguments.length?(y=+n,d):y},d.strength=function(n){return arguments.length?(h="function"==typeof n?n:i(+n),g(),d):h},d.distance=function(n){return arguments.length?(v="function"==typeof n?n:i(+n),s(),d):v},d},n.forceManyBody=function(){var n,r,e,o,f=i(-30),a=1,c=1/0,v=.81;function y(i){var u,o=n.length,f=t.quadtree(n,l,h).visitAfter(x);for(e=i,u=0;u<o;++u)r=n[u],f.visit(g)}function d(){if(n){var t,r,e=n.length;for(o=new Array(e),t=0;t<e;++t)r=n[t],o[r.index]=+f(r,t,n)}}function x(n){var t,r,e,i,u,f=0,a=0;if(n.length){for(e=i=u=0;u<4;++u)(t=n[u])&&(r=Math.abs(t.value))&&(f+=t.value,a+=r,e+=r*t.x,i+=r*t.y);n.x=e/a,n.y=i/a}else{(t=n).x=t.data.x,t.y=t.data.y;do{f+=o[t.data.index]}while(t=t.next)}n.value=f}function g(n,t,i,f){if(!n.value)return!0;var l=n.x-r.x,h=n.y-r.y,y=f-t,d=l*l+h*h;if(y*y/v<d)return d<c&&(0===l&&(d+=(l=u())*l),0===h&&(d+=(h=u())*h),d<a&&(d=Math.sqrt(a*d)),r.vx+=l*n.value*e/d,r.vy+=h*n.value*e/d),!0;if(!(n.length||d>=c)){(n.data!==r||n.next)&&(0===l&&(d+=(l=u())*l),0===h&&(d+=(h=u())*h),d<a&&(d=Math.sqrt(a*d)));do{n.data!==r&&(y=o[n.data.index]*e/d,r.vx+=l*y,r.vy+=h*y)}while(n=n.next)}}return y.initialize=function(t){n=t,d()},y.strength=function(n){return arguments.length?(f="function"==typeof n?n:i(+n),d(),y):f},y.distanceMin=function(n){return arguments.length?(a=n*n,y):Math.sqrt(a)},y.distanceMax=function(n){return arguments.length?(c=n*n,y):Math.sqrt(c)},y.theta=function(n){return arguments.length?(v=n*n,y):Math.sqrt(v)},y},n.forceRadial=function(n,t,r){var e,u,o,f=i(.1);function a(n){for(var i=0,f=e.length;i<f;++i){var a=e[i],c=a.x-t||1e-6,l=a.y-r||1e-6,h=Math.sqrt(c*c+l*l),v=(o[i]-h)*u[i]*n/h;a.vx+=c*v,a.vy+=l*v}}function c(){if(e){var t,r=e.length;for(u=new Array(r),o=new Array(r),t=0;t<r;++t)o[t]=+n(e[t],t,e),u[t]=isNaN(o[t])?0:+f(e[t],t,e)}}return"function"!=typeof n&&(n=i(+n)),null==t&&(t=0),null==r&&(r=0),a.initialize=function(n){e=n,c()},a.strength=function(n){return arguments.length?(f="function"==typeof n?n:i(+n),c(),a):f},a.radius=function(t){return arguments.length?(n="function"==typeof t?t:i(+t),c(),a):n},a.x=function(n){return arguments.length?(t=+n,a):t},a.y=function(n){return arguments.length?(r=+n,a):r},a},n.forceSimulation=function(n){var t,i=1,u=.001,o=1-Math.pow(u,1/300),f=0,a=.6,c=new Map,l=e.timer(d),h=r.dispatch("tick","end");function d(){x(),h.call("tick",t),i<u&&(l.stop(),h.call("end",t))}function x(r){var e,u,l=n.length;void 0===r&&(r=1);for(var h=0;h<r;++h)for(i+=(f-i)*o,c.forEach(function(n){n(i)}),e=0;e<l;++e)null==(u=n[e]).fx?u.x+=u.vx*=a:(u.x=u.fx,u.vx=0),null==u.fy?u.y+=u.vy*=a:(u.y=u.fy,u.vy=0);return t}function g(){for(var t,r=0,e=n.length;r<e;++r){if((t=n[r]).index=r,null!=t.fx&&(t.x=t.fx),null!=t.fy&&(t.y=t.fy),isNaN(t.x)||isNaN(t.y)){var i=v*Math.sqrt(r),u=r*y;t.x=i*Math.cos(u),t.y=i*Math.sin(u)}(isNaN(t.vx)||isNaN(t.vy))&&(t.vx=t.vy=0)}}function s(t){return t.initialize&&t.initialize(n),t}return null==n&&(n=[]),g(),t={tick:x,restart:function(){return l.restart(d),t},stop:function(){return l.stop(),t},nodes:function(r){return arguments.length?(n=r,g(),c.forEach(s),t):n},alpha:function(n){return arguments.length?(i=+n,t):i},alphaMin:function(n){return arguments.length?(u=+n,t):u},alphaDecay:function(n){return arguments.length?(o=+n,t):+o},alphaTarget:function(n){return arguments.length?(f=+n,t):f},velocityDecay:function(n){return arguments.length?(a=1-n,t):1-a},force:function(n,r){return arguments.length>1?(null==r?c.delete(n):c.set(n,s(r)),t):c.get(n)},find:function(t,r,e){var i,u,o,f,a,c=0,l=n.length;for(null==e?e=1/0:e*=e,c=0;c<l;++c)(o=(i=t-(f=n[c]).x)*i+(u=r-f.y)*u)<e&&(a=f,e=o);return a},on:function(n,r){return arguments.length>1?(h.on(n,r),t):h.on(n)}}},n.forceX=function(n){var t,r,e,u=i(.1);function o(n){for(var i,u=0,o=t.length;u<o;++u)(i=t[u]).vx+=(e[u]-i.x)*r[u]*n}function f(){if(t){var i,o=t.length;for(r=new Array(o),e=new Array(o),i=0;i<o;++i)r[i]=isNaN(e[i]=+n(t[i],i,t))?0:+u(t[i],i,t)}}return"function"!=typeof n&&(n=i(null==n?0:+n)),o.initialize=function(n){t=n,f()},o.strength=function(n){return arguments.length?(u="function"==typeof n?n:i(+n),f(),o):u},o.x=function(t){return arguments.length?(n="function"==typeof t?t:i(+t),f(),o):n},o},n.forceY=function(n){var t,r,e,u=i(.1);function o(n){for(var i,u=0,o=t.length;u<o;++u)(i=t[u]).vy+=(e[u]-i.y)*r[u]*n}function f(){if(t){var i,o=t.length;for(r=new Array(o),e=new Array(o),i=0;i<o;++i)r[i]=isNaN(e[i]=+n(t[i],i,t))?0:+u(t[i],i,t)}}return"function"!=typeof n&&(n=i(null==n?0:+n)),o.initialize=function(n){t=n,f()},o.strength=function(n){return arguments.length?(u="function"==typeof n?n:i(+n),f(),o):u},o.y=function(t){return arguments.length?(n="function"==typeof t?t:i(+t),f(),o):n},o},Object.defineProperty(n,"__esModule",{value:!0})});
`


const workerScript = (DEFAULT_OPTIONS: LayoutOptions) => {
  class Simulation {

    private nodePadding = DEFAULT_OPTIONS.nodePadding
    private tick = DEFAULT_OPTIONS.tick
    private forceManyBody = d3.forceManyBody().distanceMax(4000).theta(0.5)
    private forceLink = d3.forceLink<SimulationNode, SimulationLinkDatum<SimulationNode>>().id((node) => node.id)
    /**
     * TODO - should be node.radius + node.totalStrokeWidth + this.nodePadding
     * also, only calculate once:
     * (node) => (this.nodeRadii[node.id] !== undefined ?
     *   this.nodeRadii[node.id] :
     *   (this.nodeRadii[node.id] = node.radius + node.totalStrokeWidth + this.nodePadding, this.nodeRadii[node.id])
     * )
     * (node) => (this.nodeRadii[node.id] ??= node.radius + node.totalStrokeWidth + this.nodePadding)
     */
    private forceCollide = d3.forceCollide<SimulationNode>().radius((node) => node.radius + this.nodePadding)
    private forceX = d3.forceX(0)
    private forceY = d3.forceY(0)

    simulation = d3.forceSimulation<SimulationNode>()
      .force('charge', this.forceManyBody)
      .force('collision', this.forceCollide)
      .force('link', this.forceLink)
      .force('x', this.forceX)
      .force('y', this.forceY)
      .force('center', d3.forceCenter())
      .stop()

    layout({
      nodes,
      edges,
      options: {
        nodeStrength = DEFAULT_OPTIONS.nodeStrength,
        linkDistance = DEFAULT_OPTIONS.linkDistance,
        linkStrength = DEFAULT_OPTIONS.linkStrength,
        centerStrength = DEFAULT_OPTIONS.centerStrength,
        nodePadding = DEFAULT_OPTIONS.nodePadding,
        tick = DEFAULT_OPTIONS.tick,
      } = DEFAULT_OPTIONS
    }: LayoutEvent) {
      this.forceManyBody.strength(nodeStrength)
      this.forceLink.distance(linkDistance)
      linkStrength !== undefined && this.forceLink.strength(linkStrength)
      this.forceX.strength(centerStrength)
      this.forceY.strength(centerStrength)
      this.nodePadding = nodePadding
      this.tick = tick

      this.simulation.nodes(nodes)
      this.forceLink.links(edges)

      this.simulation.alpha(1).stop().tick(this.tick)

      return this
    }
  }

  const simulation = new Simulation()

  let event: LayoutEvent | undefined

  self.onmessage = ({ data }: Message<LayoutEvent>) => {
    /**
     * drop synchronous run events
     */
    if (event === undefined) {
      setTimeout(() => {
        simulation.layout(event!)
        self.postMessage({ nodes: simulation.simulation.nodes(), v: data.v })
        event = undefined
      }, 0)
    }
    event = data
  }
}


const blob = new Blob([`${d3ForceScript}(${workerScript})(${JSON.stringify(LAYOUT_OPTIONS)})`], { type: 'application/javascript' })


// TODO - add debugging perf logs
export const Layout = () => {
  const workerUrl = URL.createObjectURL(blob)
  const worker = new Worker(workerUrl)
  let v = 0

  const layout = <N extends Node<E>, E extends Edge>(graph: { nodes: N[], edges: E[], options?: Partial<LayoutOptions> }) => {
    const edges = graph.edges
    worker.postMessage({ nodes: graph.nodes, edges: graph.edges, options: graph.options, v: ++v } as LayoutEvent)

    return new Promise<{ nodes: Extend<N, { x: number, y: number }>[], edges: E[] }>((resolve) => {
      worker.onmessage = ({ data }: Message<LayoutResultEvent<N, E>>) => {
        if (data.v === v) {
          resolve({ nodes: data.nodes, edges })
        }
      }
    })
  }

  layout.delete = () => {
    worker.terminate()
    URL.revokeObjectURL(workerUrl)
  }

  return layout
}
