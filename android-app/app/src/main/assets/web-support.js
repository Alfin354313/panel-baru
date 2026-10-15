(function(){
 if(window.__jeniusAndroidSupport)return;window.__jeniusAndroidSupport=true;
 function nativePrint(){location.href='jenius-print://document'}window.print=nativePrint;
 var open=window.open;window.open=function(){var child=open.apply(window,arguments);if(child){try{child.print=function(){child.location.href='jenius-print://document'}}catch(e){}}return child};
 function save(url,name){fetch(url).then(function(r){return r.blob()}).then(function(blob){if(blob.size>15*1024*1024){alert('Berkas terlalu besar. Gunakan browser untuk mengunduhnya.');return}var reader=new FileReader();reader.onload=function(){var b64=String(reader.result).split(',')[1];location.href='jenius-file://save?name='+encodeURIComponent(name||'Jenius-Edu')+'&type='+encodeURIComponent(blob.type||'application/octet-stream')+'&data='+encodeURIComponent(b64)};reader.readAsDataURL(blob)}).catch(function(){alert('Berkas belum dapat diunduh. Silakan coba lagi.')})}
 var click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.href&&(this.href.indexOf('blob:')===0||this.href.indexOf('data:')===0)){save(this.href,this.download);return}return click.apply(this,arguments)};
 document.addEventListener('click',function(e){var a=e.target.closest('a');if(a&&a.href&&(a.href.indexOf('blob:')===0||a.href.indexOf('data:')===0)){e.preventDefault();save(a.href,a.download)}},true);
})();
