function financialMonthSeries(from,to,payments,expenses){
 var parts=from.split('-'),date=new Date(Number(parts[0]),Number(parts[1])-1,1),end=to,rows=[];
 while(true){var key=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0');if(key>end)break;var inc=payments.filter(function(p){return p.bulan===key&&p.status==='Lunas'}).reduce(function(n,p){return n+Number(p.jumlah||0)},0),exp=expenses.filter(function(e){return String(e.tgl).slice(0,7)===key}).reduce(function(n,e){return n+Number(e.jumlah||0)},0);rows.push({month:key,label:date.toLocaleDateString('id-ID',{month:'short',year:'2-digit'}),inc:inc,exp:exp});date.setMonth(date.getMonth()+1)}return rows;
}
function drawFinancialLines(series){
 var max=Math.max(1,...series.map(function(q){return Math.max(q.inc,q.exp)})),left=78,right=590,top=25,bottom=205;
 function x(i){return series.length===1?(left+right)/2:left+i/(series.length-1)*(right-left)}function y(v){return bottom-v/max*(bottom-top)}
 var svg='<svg viewBox="0 0 620 245" role="img" aria-label="Grafik pendapatan dan pengeluaran per bulan"><defs><linearGradient id="reportArea" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#1688ff" stop-opacity=".25"/><stop offset="1" stop-color="#1688ff" stop-opacity=".02"/></linearGradient></defs>';
 for(var i=0;i<=4;i++){var gy=bottom-i/4*(bottom-top);svg+='<line x1="'+left+'" x2="'+right+'" y1="'+gy+'" y2="'+gy+'" stroke="#e4edf8"/><text x="70" y="'+(gy+4)+'" text-anchor="end">'+esc(rp(max*i/4))+'</text>'}
 if(series.length)svg+='<polygon points="'+x(0)+','+bottom+' '+series.map(function(q,i){return x(i)+','+y(q.inc)}).join(' ')+' '+x(series.length-1)+','+bottom+'" fill="url(#reportArea)"/>';
 ['inc','exp'].forEach(function(key){var color=key==='inc'?'#1688ff':'#8badd6';svg+='<polyline fill="none" stroke="'+color+'" stroke-width="2.5" points="'+series.map(function(q,i){return x(i)+','+y(q[key])}).join(' ')+'"/>';series.forEach(function(q,i){svg+='<circle tabindex="0" cx="'+x(i)+'" cy="'+y(q[key])+'" r="4" fill="white" stroke="'+color+'" stroke-width="2"><title>'+esc(q.label+' · Pendapatan '+rp(q.inc)+' · Pengeluaran '+rp(q.exp))+'</title></circle>'})});series.forEach(function(q,i){if(series.length<=8||i%Math.ceil(series.length/8)===0||i===series.length-1)svg+='<text x="'+x(i)+'" y="232" text-anchor="middle">'+esc(q.label)+'</text>'});$('financialReportChart').innerHTML=svg+'</svg>';
}
