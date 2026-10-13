/* Category totals for the selected expense filters, including all pages. */
function expenseChartData(rows){
 var sums=Object.create(null);rows.forEach(function(r){var n=Number(r.jumlah||0);if(!Number.isFinite(n)||n<=0)return;var k=r.kat||'Lainnya';sums[k]=(sums[k]||0)+n});
 var categories=Object.keys(sums).map(function(k){return {name:k,value:sums[k]}}).sort(function(a,b){return b.value-a.value||a.name.localeCompare(b.name)});
 var total=categories.reduce(function(n,c){return n+c.value},0);
 categories.forEach(function(c){c.percent=total?c.value/total*100:0});return {total:total,categories:categories};
}
function drawExpenseCharts(rows){
 var data=expenseChartData(rows),colors=['#1688ff','#ffa21a','#8428f5','#00a67a','#ec526a','#327bb6'];
 function color(name){var hash=0;for(var i=0;i<name.length;i++)hash=(hash*31+name.charCodeAt(i))>>>0;return colors[hash%colors.length]}
 var start=0;var stops=data.categories.map(function(c){var end=start+c.percent,v=color(c.name)+' '+start+'% '+end+'%';start=end;return v});
 $('expenseDonut').style.background=data.total?'conic-gradient('+stops.join(',')+')':'#eaf1f8';$('expenseDonutTotal').textContent=rp(data.total);
 $('expenseDonut').setAttribute('aria-label',data.total?'Distribusi pengeluaran: '+data.categories.map(function(c){return c.name+' '+c.percent.toFixed(1)+' persen'}).join(', '):'Belum ada data pengeluaran pada filter ini');
 $('expenseLegend').innerHTML=data.categories.map(function(c){return '<div class="expense-legend-row"><i style="background:'+color(c.name)+'"></i><span>'+esc(c.name)+'</span><b>'+c.percent.toFixed(1)+'%</b></div>'}).join('')||'<p class="expense-chart-empty">Belum ada pengeluaran.</p>';
 var maximum=Math.max(1,...data.categories.map(function(c){return c.value}));
 $('expenseCategoryBars').innerHTML=data.categories.map(function(c){return '<div class="expense-category-row"><span>'+esc(c.name)+'</span><div class="expense-bar-track" role="img" aria-label="'+esc(c.name)+' '+rp(c.value)+'"><i style="width:'+c.value/maximum*100+'%;background:'+color(c.name)+'"></i></div><b>'+rp(c.value)+'</b></div>'}).join('')||'<p class="expense-chart-empty">Belum ada pengeluaran.</p>';
}
