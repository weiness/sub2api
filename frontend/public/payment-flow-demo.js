const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
const money=value=>`¥${Number(value).toFixed(2)}`;
const plans=[
  {id:1,name:'GPT - Lite',desc:'适合入门体验，轻量使用',price:39,original:50,limit:'$500',sold:128,discount:22,days:30},
  {id:2,name:'GPT - Pro',desc:'适合大多数用户，高效使用',price:179,original:300,limit:'$3000',sold:1523,discount:40,days:30,recommended:true},
  {id:3,name:'GPT - Mini',desc:'适合日常使用，性价比之选',price:69,original:100,limit:'$1000',sold:336,discount:31,days:30},
  {id:4,name:'GPT - Max',desc:'适合高频使用，专业用户',price:299,original:600,limit:'$6000',sold:278,discount:50,days:30}
];
const configuredPaymentMethods=[
  {id:'alipay',name:'支付宝',description:'安全快捷，推荐使用',icon:'./payment-flow-icons/alipay.svg'}
];
const state={catalogMode:'recharge',amount:0,plan:null,orderId:0,orderNumber:'',seconds:1799,timer:null,balance:100};

function renderRechargeChoices(){
  const values=[10,20,50,100,500,1000,2000,5000];
  $('#recharge-grid').innerHTML=values.map(value=>`<button class="amount-choice" data-amount="${value}"><span class="selection-check"><span class="icon icon-check"></span></span>${value===100?'<span class="recommend-tag">推荐</span>':''}<strong>¥${value}</strong><span>$${value*10} 额度</span>${value===100?'<small>赠送 $50 额度</small>':''}</button>`).join('')+`<label class="custom-choice"><span class="selection-check"><span class="icon icon-check"></span></span><strong>自定义金额</strong><span class="custom-input-wrap"><span>¥</span><input id="custom-amount" inputmode="decimal" placeholder="请输入金额"></span><small>最低充值 ¥10</small></label>`;
  $$('[data-amount]').forEach(button=>button.addEventListener('click',()=>selectAmount(Number(button.dataset.amount),button)));
  $('#custom-amount').addEventListener('input',event=>selectAmount(Number(event.target.value),null));
}

function renderPlans(){
  $('#plan-grid').innerHTML=plans.map(plan=>`<article class="plan-card ${plan.recommended?'recommended':''}"><div class="plan-head"><h3>${plan.name}</h3><em class="platform platform-openai">OpenAI</em><span class="sold">已售 ${plan.sold}</span></div><p class="plan-desc">${plan.desc}</p><div class="plan-price"><span>¥</span><strong>${plan.price}</strong><span>CNY / ${plan.days}天</span>${plan.recommended?'<span class="subscription-recommend-badge">推荐</span>':''}</div><div class="old-price"><s>¥${plan.original} CNY</s><span class="discount">省 ${plan.discount}%</span></div><div class="plan-facts"><div><span class="fact-label"><i class="icon icon-calendar fact-day-icon"></i>日限额</span><strong>$0</strong></div><div><span class="fact-label"><i class="icon icon-calendar fact-week-icon"></i>周限额</span><strong>$0</strong></div><div><span class="fact-label"><i class="icon icon-calendar fact-month-icon"></i>月限额</span><strong>${plan.limit}</strong></div></div><button data-plan="${plan.id}">立即订阅</button></article>`).join('');
  $$('[data-plan]').forEach(button=>button.addEventListener('click',()=>openSubscriptionConfirm(Number(button.dataset.plan))));
}

function setCatalogMode(mode){
  state.catalogMode=mode;
  $('.catalog-content').dataset.activeCatalog=mode;
  $$('[data-catalog-mode]').forEach(button=>button.classList.toggle('active',button.dataset.catalogMode===mode));
  $('#recharge-catalog').hidden=mode!=='recharge';
  $('#subscription-catalog').hidden=mode!=='subscription';
}

function selectAmount(value,button){
  state.amount=Number.isFinite(value)&&value>=10?value:0;
  $$('[data-amount]').forEach(item=>item.classList.toggle('selected',item===button));
  $('.custom-choice').classList.toggle('selected',!button&&state.amount>0);
  if(button) $('#custom-amount').value='';
  $('#submit-recharge').disabled=state.amount===0;
}

function prepareOrder(prefix){
  state.orderId=Math.floor(100000+Math.random()*900000);
  state.orderNumber=`${prefix}${Date.now().toString().slice(-12)}`;
  $('#confirm-order-number').textContent=state.orderNumber;
}

function openRechargeConfirm(){
  if(!state.amount)return;
  state.catalogMode='recharge';
  prepareOrder('RC');
  $('#confirm-title').textContent='确认订单（余额充值）';
  $('#step-one-label').textContent='选择金额';
  $('#recharge-confirm-content').hidden=false;
  $('#subscription-confirm-content').hidden=true;
  $('#confirm-recharge-amount').textContent=money(state.amount);
  $('#confirm-credit-amount').textContent=`$${(state.amount*10).toFixed(2)}`;
  $('#confirm-order-type').textContent='余额充值';
  $('#confirm-fee-label').textContent='支付金额';
  $('#confirm-pay-amount').textContent=money(state.amount);
  $('#confirm-benefit-label').textContent='到账额度';
  $('#confirm-benefit-value').textContent=`$${(state.amount*10).toFixed(2)}`;
  $('#confirm-payment').textContent=`确认支付 ${money(state.amount)}`;
  showOnly('confirm-view');
}

function openSubscriptionConfirm(planId){
  state.catalogMode='subscription';
  state.plan=plans.find(plan=>plan.id===planId);
  prepareOrder('SUB');
  $('#confirm-title').textContent='确认订单（套餐订阅）';
  $('#step-one-label').textContent='选择套餐';
  $('#recharge-confirm-content').hidden=true;
  $('#subscription-confirm-content').hidden=false;
  $('#confirm-plan-name').innerHTML=`${state.plan.name} <em class="platform platform-openai">OpenAI</em>`;
  $('#confirm-plan-desc').textContent=state.plan.desc;
  $('#confirm-plan-limit').textContent=state.plan.limit;
  $('#confirm-plan-days').textContent=`${state.plan.days}天`;
  $('#confirm-order-type').textContent='套餐订阅';
  $('#confirm-fee-label').textContent=`套餐费用（${state.plan.days}天）`;
  $('#confirm-pay-amount').textContent=money(state.plan.price);
  $('#confirm-benefit-label').textContent='实付金额';
  $('#confirm-benefit-value').textContent=money(state.plan.price);
  $('#confirm-payment').textContent=`确认支付 ${money(state.plan.price)}`;
  showOnly('confirm-view');
}

function showOnly(viewId){
  ['catalog-view','confirm-view','payment-view','result-view'].forEach(id=>{document.getElementById(id).hidden=id!==viewId;});
  window.scrollTo({top:0,behavior:'smooth'});
}

function openPayment(){
  state.seconds=1799;
  $('#waiting-order-number').textContent=state.orderNumber;
  $('#waiting-summary').innerHTML=state.catalogMode==='subscription'?subscriptionSummary():rechargeSummary();
  $('#success-tip').textContent=state.catalogMode==='subscription'?'• 支付成功后，套餐立即生效并为您开启服务':'• 支付成功后，额度将自动充值到您的账户';
  drawQR();
  startTimer();
  $('#callback-loading').hidden=true;
  $$('[data-outcome]').forEach(button=>button.disabled=false);
  showOnly('payment-view');
}

function rechargeSummary(){
  return `<h2>充值信息</h2><div class="summary-recharge"><div class="summary-item"><span class="round-icon"><span class="icon icon-credit-card"></span></span><p><span>充值金额</span><strong>${money(state.amount)}</strong></p></div><div class="summary-item"><span class="round-icon"><span class="icon icon-coins"></span></span><p><span>到账额度</span><strong>$${(state.amount*10).toFixed(2)}</strong></p></div><div class="summary-item"><span class="round-icon"><span class="icon icon-dollar"></span></span><p><span>当前汇率</span><strong class="rate-value">1 CNY = $10 额度</strong></p></div></div>`;
}

function subscriptionSummary(){
  return `<h2>订阅套餐</h2><div class="summary-plan"><span class="plan-avatar"><img src="./payment-flow-icons/openai.svg" alt="OpenAI"></span><div><h3>${state.plan.name} <em class="platform platform-openai">OpenAI</em></h3><p>${state.plan.desc}</p></div></div><div class="summary-items"><div class="summary-item"><span><i class="icon icon-calendar"></i>订阅周期</span><strong>${state.plan.days}天</strong></div><div class="summary-item"><span><i class="icon icon-alarm"></i>到期时间</span><strong>2024-06-23 14:30</strong></div><div class="summary-item"><span><i class="icon icon-banknote"></i>套餐费用</span><strong>${money(state.plan.price)}</strong></div></div>`;
}

function startTimer(){
  clearInterval(state.timer);updateTimer();
  state.timer=setInterval(()=>{state.seconds-=1;updateTimer();if(state.seconds<=0)finishOrder('expired');},1000);
}
function updateTimer(){const m=Math.floor(Math.max(0,state.seconds)/60).toString().padStart(2,'0');const s=(Math.max(0,state.seconds)%60).toString().padStart(2,'0');$('#countdown').textContent=`${m}:${s}`;}

function simulateOutcome(outcome){
  $$('[data-outcome]').forEach(button=>button.disabled=true);
  $('#callback-loading').hidden=false;
  setTimeout(()=>finishOrder(outcome),650);
}

function finishOrder(outcome){
  clearInterval(state.timer);
  const amount=state.catalogMode==='subscription'?state.plan.price:state.amount;
  const copy={success:['success','✓',state.catalogMode==='subscription'?'订阅成功':'充值成功',state.catalogMode==='subscription'?'套餐已成功开通':'账户余额已成功充值'],failed:['failed','×','支付失败','支付未完成，请重新创建订单'],expired:['expired','!','订单已过期','订单已超时，请重新创建订单']}[outcome];
  $('#result-panel').className=`result-panel ${copy[0]}`;
  $('#result-icon').textContent=copy[1];
  $('#result-title').textContent=copy[2];
  $('#result-description').textContent=copy[3];
  $('#result-id').textContent=`#${state.orderId}`;
  $('#result-number').textContent=state.orderNumber;
  $('#result-amount-label').textContent=state.catalogMode==='subscription'?'支付金额':'充值金额';
  $('#result-amount').textContent=money(amount);
  $('#result-benefit-row').hidden=outcome!=='success';
  if(state.catalogMode==='subscription'){$('#result-benefit-label').textContent='开通套餐';$('#result-benefit').textContent=`${state.plan.name} · ${state.plan.days}天`;}else{$('#result-benefit-label').textContent='到账金额';$('#result-benefit').textContent=`$${(state.amount*10).toFixed(2)}`;if(outcome==='success'){state.balance+=state.amount*10;$('#balance-value').textContent=`$${state.balance.toFixed(2)}`;}}
  $('#result-done').textContent='确认';
  showOnly('result-view');
}

function cancelCurrent(){clearInterval(state.timer);showOnly('catalog-view');setCatalogMode(state.catalogMode);}
function resetFromResult(){state.amount=0;state.plan=null;$('#submit-recharge').disabled=true;$$('[data-amount]').forEach(item=>item.classList.remove('selected'));$('.custom-choice').classList.remove('selected');$('#custom-amount').value='';showOnly('catalog-view');setCatalogMode(state.catalogMode);}

function renderPaymentMethods(){
  $('#payment-methods').innerHTML=configuredPaymentMethods.map((method,index)=>`<button class="payment-method ${index===0?'selected':''}" data-payment-method="${method.id}"><img src="${method.icon}" alt=""><span><strong>${method.name}</strong><small>${method.description}</small></span><b><span class="icon icon-check"></span></b></button>`).join('');
}

function drawQR(){
  const canvas=$('#qr-canvas'),context=canvas.getContext('2d'),cells=29,size=canvas.width/cells;
  context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
  let seed=state.orderNumber.split('').reduce((sum,char)=>sum+char.charCodeAt(0),0);const random=()=>{seed=(seed*9301+49297)%233280;return seed/233280;};
  context.fillStyle='#050505';
  for(let y=0;y<cells;y+=1)for(let x=0;x<cells;x+=1){const finder=(x<9&&y<9)||(x>19&&y<9)||(x<9&&y>19);if(!finder&&random()>.53)context.fillRect(Math.floor(x*size),Math.floor(y*size),Math.ceil(size),Math.ceil(size));}
  [[1,1],[21,1],[1,21]].forEach(([x,y])=>drawFinder(context,x,y,size));
}
function drawFinder(context,x,y,size){context.fillStyle='#050505';context.fillRect(x*size,y*size,7*size,7*size);context.fillStyle='#fff';context.fillRect((x+1)*size,(y+1)*size,5*size,5*size);context.fillStyle='#050505';context.fillRect((x+2)*size,(y+2)*size,3*size,3*size);}

renderRechargeChoices();renderPlans();renderPaymentMethods();
$$('[data-catalog-mode]').forEach(button=>button.addEventListener('click',()=>setCatalogMode(button.dataset.catalogMode)));
$('#submit-recharge').addEventListener('click',openRechargeConfirm);
$('#confirm-payment').addEventListener('click',openPayment);
$('#cancel-confirm').addEventListener('click',cancelCurrent);
$('#cancel-order').addEventListener('click',cancelCurrent);
$$('[data-outcome]').forEach(button=>button.addEventListener('click',()=>simulateOutcome(button.dataset.outcome)));
$('#result-done').addEventListener('click',resetFromResult);
