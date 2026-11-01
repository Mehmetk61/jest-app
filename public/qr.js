// Küçük QR üretici (bayt kipi, düzeltme düzeyi M, sürüm 1-10, en çok ~190 bayt). Dış paket yok.
(function(g){
var ECC=[0,10,16,26,18,24,16,18,22,22,26],BLK=[0,1,1,1,2,2,4,4,4,5,5];
function raw(v){var r=(16*v+128)*v+64;if(v>=2){var n=Math.floor(v/7)+2;r-=(25*n-10)*n-55;if(v>=7)r-=36}return r}
var EXP=[],LOG=[];(function(){var x=1;for(var i=0;i<255;i++){EXP[i]=x;LOG[x]=i;x<<=1;if(x&256)x^=0x11D}for(i=255;i<512;i++)EXP[i]=EXP[i-255]})();
function mul(a,b){return a&&b?EXP[LOG[a]+LOG[b]]:0}
function rsGen(d){var r=[1];for(var i=0;i<d;i++){var n=r.concat([0]);for(var j=0;j<r.length;j++){n[j]=mul(r[j],EXP[i])^(j?mul(r[j-1],EXP[i]):0);}
  var m=new Array(r.length+1).fill(0);for(j=0;j<r.length;j++){m[j]^=r[j];m[j+1]^=mul(r[j],EXP[i])}r=m}return r}
function rs(data,d){var g=rsGen(d),res=new Array(d).fill(0);data.forEach(function(b){var f=b^res.shift();res.push(0);for(var i=0;i<d;i++)res[i]^=mul(g[i+1],f)});return res}
function encode(text){
  var bytes=Array.from(new TextEncoder().encode(text)),v;
  for(v=1;v<=10;v++){var cap=(Math.floor(raw(v)/8)-ECC[v]*BLK[v])*8;if(4+(v<10?8:16)+bytes.length*8<=cap)break}
  if(v>10)throw new Error('QR için metin çok uzun');
  var bits=[];function put(val,n){for(var i=n-1;i>=0;i--)bits.push((val>>i)&1)}
  put(4,4);put(bytes.length,v<10?8:16);bytes.forEach(function(b){put(b,8)});
  var capb=(Math.floor(raw(v)/8)-ECC[v]*BLK[v])*8;put(0,Math.min(4,capb-bits.length));while(bits.length%8)bits.push(0);
  var data=[];for(var i=0;i<bits.length;i+=8){var b=0;for(var j=0;j<8;j++)b=b<<1|bits[i+j];data.push(b)}
  for(var p=0xEC;data.length<capb/8;p^=0xEC^0x11)data.push(p);
  var nb=BLK[v],eb=ECC[v],rc=Math.floor(raw(v)/8),ns=nb-rc%nb,sl=Math.floor(rc/nb),blocks=[],k=0;
  for(i=0;i<nb;i++){var dl=sl-eb+(i<ns?0:1),d=data.slice(k,k+dl);k+=dl;blocks.push({d:d,e:rs(d,eb)})}
  var out=[];for(i=0;i<sl-eb+1;i++)blocks.forEach(function(bl){if(i<bl.d.length)out.push(bl.d[i])});
  for(i=0;i<eb;i++)blocks.forEach(function(bl){out.push(bl.e[i])});
  var size=v*4+17,M=[],F=[];for(i=0;i<size;i++){M.push(new Array(size).fill(false));F.push(new Array(size).fill(false))}
  function sf(x,y,dark){if(x>=0&&x<size&&y>=0&&y<size){M[y][x]=dark;F[y][x]=true}}
  for(i=0;i<size;i++){sf(6,i,i%2==0);sf(i,6,i%2==0)}
  function finder(x,y){for(var dy=-4;dy<=4;dy++)for(var dx=-4;dx<=4;dx++){var dist=Math.max(Math.abs(dx),Math.abs(dy));sf(x+dx,y+dy,dist!=2&&dist!=4)}}
  finder(3,3);finder(size-4,3);finder(3,size-4);
  var ap=[];if(v>1){var na=Math.floor(v/7)+2,step=Math.ceil((v*4+4)/(na*2-2))*2;ap=[6];for(var pos=size-7;ap.length<na;pos-=step)ap.splice(1,0,pos)}
  ap.forEach(function(a,ia){ap.forEach(function(b,ib){if((ia==0&&ib==0)||(ia==0&&ib==ap.length-1)||(ia==ap.length-1&&ib==0))return;
    for(var dy=-2;dy<=2;dy++)for(var dx=-2;dx<=2;dx++)sf(a+dx,b+dy,Math.max(Math.abs(dx),Math.abs(dy))!=1)})});
  function fmt(mask){var dd=(0<<3)|mask,r=dd;for(var i=0;i<10;i++)r=(r<<1)^((r>>9)*0x537);var bt=((dd<<10)|r)^0x5412;function bit(i){return((bt>>i)&1)!=0}
    for(i=0;i<=5;i++)sf(8,i,bit(i));sf(8,7,bit(6));sf(8,8,bit(7));sf(7,8,bit(8));for(i=9;i<15;i++)sf(14-i,8,bit(i));
    for(i=0;i<8;i++)sf(size-1-i,8,bit(i));for(i=8;i<15;i++)sf(8,size-15+i,bit(i));sf(8,size-8,true)}
  fmt(0);
  if(v>=7){var r2=v;for(i=0;i<12;i++)r2=(r2<<1)^((r2>>11)*0x1F25);var vb=(v<<12)|r2;for(i=0;i<18;i++){var bt2=((vb>>i)&1)!=0,a=size-11+i%3,b2=Math.floor(i/3);sf(a,b2,bt2);sf(b2,a,bt2)}}
  var idx=0;for(var right=size-1;right>=1;right-=2){if(right==6)right=5;for(var vert=0;vert<size;vert++)for(var j=0;j<2;j++){var x=right-j,up=((right+1)&2)==0,y=up?size-1-vert:vert;
    if(!F[y][x]&&idx<out.length*8){M[y][x]=((out[idx>>3]>>(7-(idx&7)))&1)!=0;idx++}}}
  for(y=0;y<size;y++)for(x=0;x<size;x++)if(!F[y][x]&&(x+y)%2==0)M[y][x]=!M[y][x];
  return M}
g.jestQR=function(text,cell){cell=cell||6;var M=encode(text),n=M.length,q=4,w=(n+q*2)*cell,d='';
  for(var y=0;y<n;y++)for(var x=0;x<n;x++)if(M[y][x])d+='M'+((x+q)*cell)+' '+((y+q)*cell)+'h'+cell+'v'+cell+'h-'+cell+'z';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+w+'" width="'+w+'" height="'+w+'" role="img" aria-label="QR kodu"><rect width="'+w+'" height="'+w+'" fill="#fff"/><path d="'+d+'" fill="#000"/></svg>'};
g.jestQRMatrix=encode;
if(typeof module!=='undefined')module.exports={encode:encode};
})(typeof window!=='undefined'?window:globalThis);
