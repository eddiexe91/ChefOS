const fs = require('node:fs');
const { Resvg } = require('@resvg/resvg-js');
const svg = fs.readFileSync('public/chefos-mark.svg','utf8');
function png(source, size, path) { fs.writeFileSync(path,new Resvg(source,{fitTo:{mode:'width',value:size}}).render().asPng()); }
for(const [density,size] of Object.entries({mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192})) {
  for(const name of ['ic_launcher','ic_launcher_round']) png(svg,size,`android/app/src/main/res/mipmap-${density}/${name}.png`);
  const foreground=svg.replace('<rect width="108" height="108" fill="#101613"/>','');
  png(foreground,size*108/48,`android/app/src/main/res/mipmap-${density}/ic_launcher_foreground.png`);
}
for(const size of [192,512]) { fs.mkdirSync('public/icons',{recursive:true});png(svg,size,`public/icons/icon-${size}.png`); }
png(svg,512,'public/chefos-icon.png');
