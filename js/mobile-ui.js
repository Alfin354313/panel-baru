/* Mobile presentation only. Original controls, records and event handlers remain in place. */
(function(){
 'use strict';
 var mq=window.matchMedia('(max-width:899px)');
 function brand(label){var el=document.createElement('div');el.className='mobile-header-brand';el.innerHTML='<img src="./assets/jenius-edu-logo.png" alt=""><span><b>Jenius Edu</b><small>'+label+'</small></span>';return el}
 var adminHead=document.querySelector('#app>header'),teacherHead=document.querySelector('#teacherApp .teacher-head');
 if(adminHead)adminHead.prepend(brand('Panel Pengelola'));if(teacherHead)teacherHead.prepend(brand('Panel Guru'));
 var more=document.getElementById('mobileMoreMenu'),panel=document.getElementById('mobileMorePanel');
 function closeMenu(){if(panel)panel.hidden=true;if(more){more.classList.remove('on');more.setAttribute('aria-expanded','false')}}
 if(more&&panel){more.setAttribute('aria-controls','mobileMorePanel');more.setAttribute('aria-expanded','false');more.onclick=function(e){e.stopPropagation();var open=panel.hidden;panel.hidden=!open;more.classList.toggle('on',open);more.setAttribute('aria-expanded',String(open))};document.addEventListener('click',function(e){if(!panel.hidden&&!panel.contains(e.target)&&!more.contains(e.target))closeMenu()});document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!panel.hidden){closeMenu();more.focus()}});panel.addEventListener('click',function(e){if(e.target.closest('button'))closeMenu()});}
 var ids=['dashboardStudentBody','bm','bp','be','teacherMasterBody','salaryBody','auditLogBody','financialReportBody','attendanceBody','teacherNotesBody','teacherReportsBody'];
 function labelRows(body){var table=body.closest('table');if(!table)return;table.classList.add('mobile-record-table');var headings=Array.from(table.querySelectorAll('thead th')).map(function(th){return th.textContent.trim()});Array.from(body.rows).forEach(function(row){Array.from(row.cells).forEach(function(cell,i){if(cell.colSpan>1)return;cell.dataset.mobileLabel=headings[i]||''})})}
 ids.forEach(function(id){var body=document.getElementById(id);if(!body)return;labelRows(body);new MutationObserver(function(){labelRows(body)}).observe(body,{childList:true,subtree:false})});
 mq.addEventListener('change',function(){closeMenu()});
})();
