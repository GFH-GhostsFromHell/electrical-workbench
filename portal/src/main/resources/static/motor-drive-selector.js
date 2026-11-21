/* Electrical Workbench motor starter/drive advisory selector.
 * Pure JavaScript; no cloud/API dependency; no manufacturer catalog is inferred.
 * The "eligible" status describes an engineering method, NOT a device approval.
 */
(function (global) {
  'use strict';
  const FAMILIES=Object.freeze({
    ac_induction_3:'Three-phase AC induction',
    ac_synchronous_3:'Three-phase synchronous / PMAC',
    ac_cap_start_1:'Single-phase capacitor-start',
    ac_cap_run_1:'Single-phase permanent-split-capacitor (PSC)',
    ac_other_1:'Other single-phase AC',
    dc_shunt:'Brushed DC shunt / separately excited',
    dc_pm:'Brushed permanent-magnet DC',
    dc_series:'Brushed DC series / compound',
    dc_bldc:'Brushless DC (BLDC) / servo'
  });
  const METHODS=Object.freeze({
    dol:{name:'Direct-on-line (DOL) magnetic starter',kind:'starter'},
    reversing:{name:'Reversing magnetic starter',kind:'starter'},
    wye_delta:{name:'Wye–delta (star–delta) starter',kind:'starter'},
    soft:{name:'Solid-state soft starter',kind:'softstarter'},
    vfd:{name:'AC variable-frequency drive (VFD)',kind:'drive'},
    auto:{name:'Autotransformer reduced-voltage starter',kind:'starter'},
    part:{name:'Part-winding starter',kind:'starter'},
    cap:{name:'Motor-integrated capacitor-start circuit',kind:'motor'},
    psc:{name:'Permanent-split-capacitor motor controls',kind:'motor'},
    dc_control:{name:'DC-rated magnetic controller / starting resistance',kind:'starter'},
    dc_drive:{name:'Regulated DC armature drive',kind:'drive'},
    brushless:{name:'BLDC / PMAC servo or matched electronic controller',kind:'drive'}
  });
  function positive(value) { const n=Number(value); return Number.isFinite(n)&&n>0?n:null; }
  function optional(value){return value===null||value===undefined||String(value).trim()===''?null:positive(value);}
  function rounded(n,digits){return Number(n.toFixed(digits===undefined?2:digits));}
  function compute(raw) {
    const x=Object.assign({family:'ac_induction_3',supply:'ac3',volts:600,motorVolts:575,
      fla:15,hp:'',nameplateRpm:'',deltaVolts:'',leads:'3',goal:'simple',
      load:'normal',startsHour:2,startSeconds:8,lraMultiple:'',braking:false,
      reversing:false,controlSupply:'',ambient:40,installation:'standard',
      candidateAmps:'',deratingPct:100,motorDuty:'continuous'},raw||{});
    const problems=[],warnings=[],checks=[];
    if(!FAMILIES[x.family])problems.push('Choose a supported motor family.');
    if(!['ac3','ac1','dc'].includes(x.supply))problems.push('Choose the correct supply type.');
    for(const [key,label] of [['volts','Supply voltage'],['motorVolts','Motor nameplate voltage'],['fla','Motor nameplate full-load current (FLA)']]){
      if(!positive(x[key]))problems.push(label+' must be greater than zero.');
    }
    if(!['simple','inrush','variable','torque','reverse'].includes(x.goal))problems.push('Choose a valid operating goal.');
    if(!['light','normal','heavy'].includes(x.load))problems.push('Choose a valid starting-load class.');
    const starts=positive(x.startsHour),seconds=positive(x.startSeconds);
    if(!starts||starts>10000)problems.push('Starts per hour must be between 1 and 10,000.');
    if(!seconds||seconds>3600)problems.push('Start duration must be between 0 and 3,600 seconds.');
    const lra=optional(x.lraMultiple),delta=optional(x.deltaVolts),hp=optional(x.hp),rpm=optional(x.nameplateRpm),
      candidateAmps=optional(x.candidateAmps),deratingPct=positive(x.deratingPct);
    if(String(x.lraMultiple||'').trim()&&!lra)problems.push('Locked-rotor multiple must be a positive number.');
    if(String(x.deltaVolts||'').trim()&&!delta)problems.push('Delta winding voltage must be a positive number.');
    if(String(x.hp||'').trim()&&!hp)problems.push('Motor horsepower must be a positive number.');
    if(String(x.nameplateRpm||'').trim()&&!rpm)problems.push('Rated RPM must be a positive number.');
    if(String(x.candidateAmps||'').trim()&&!candidateAmps)problems.push('Candidate catalog continuous current must be positive.');
    if(!deratingPct||deratingPct>100)problems.push('Manufacturer derating percentage must be greater than 0 and no more than 100.');
    if(problems.length)return {valid:false,errors:problems,warnings:[],checks:[],methods:[],calculations:{},recommendations:[]};
    const is3=x.family==='ac_induction_3',sync=x.family==='ac_synchronous_3',
      single=x.family.startsWith('ac_')&&!is3&&!sync,
      dc=x.family.startsWith('dc_'),brushless=x.family==='dc_bldc',
      dcBrush=dc&&!brushless,acMotor=!dc,acSupply=x.supply!=='dc';
    const motorAmps=Number(x.fla),volts=Number(x.volts),motorVolts=Number(x.motorVolts);
    const high=(x.load==='heavy'||x.goal==='torque'),freq=Number(x.startsHour);
    const supplyCompatible=(acMotor&&acSupply)||(dcBrush&&x.supply==='dc')||(brushless);
    const mismatch=Math.abs(volts-motorVolts)/motorVolts;
    const severeVoltageMismatch=mismatch>.10;
    if(mismatch>.035)warnings.push('Supply and motor nameplate voltages differ by '+rounded(mismatch*100,1)+'%. Verify the motor connection and the allowed voltage range of the complete starter/drive system; the selector does not approve this difference.');
    if(severeVoltageMismatch)warnings.push('MATERIAL VOLTAGE MISMATCH: Never connect a motor directly across this source without a manufacturer-approved winding/voltage configuration. Drive output-voltage capability must also be confirmed. The 10% threshold is a screening flag, NOT an allowed operating tolerance.');
    if(candidateAmps){
      const effective=candidateAmps*deratingPct/100;
      if(effective<motorAmps)warnings.push('Candidate catalog current after entered derating ('+rounded(effective)+' A) is BELOW motor FLA ('+rounded(motorAmps)+' A); this device FAILS continuous-current screening.');
      else warnings.push('Candidate current passes continuous-FLA screening ONLY; verify the actual output current duty, time-limited overload, start duty, voltage and OEM derating tables.');
    }
    if(acMotor&&x.supply==='dc')warnings.push('AC motor on a DC source requires a correctly rated inverter/controller; no direct AC starter may be connected to DC.');
    if(dcBrush&&acSupply)warnings.push('A brushed DC motor needs a correctly rated DC output supply/drive; direct connection to AC is not suitable.');
    if(x.supply==='ac1'&&(is3||sync))warnings.push('Single-phase input for a three-phase motor requires a manufacturer-approved drive with single-phase input ratings and derating; contactor/soft-starter approaches do not create three-phase power.');
    if(freq>10||seconds>15)warnings.push('Frequent or extended starts: validate starter thermal capacity, motor heating, duty cycle and allowable starts per hour against the exact equipment data.');
    if(high)warnings.push('High starting torque/inertia: obtain a motor/load torque-versus-speed and acceleration study. A reduced-voltage starter may stall or overheat the motor.');
    if(x.braking)warnings.push('Stopping/braking is requested: confirm safe stopping category, coast versus controlled stop, load energy, braking resistor/regeneration and machine safety requirements.');
    if(x.installation==='harsh')warnings.push('Harsh environment: verify altitude, ambient, enclosure/NEMA/IP rating, dust/moisture, cooling, vibration and hazardous location approvals.');
    warnings.push('Select by actual motor nameplate FLA and the manufacturer’s continuous output / utilization-category rating, after applicable derating—not horsepower alone.');
    const entries=[];
    function add(id,status,reason,requirements,priority){
      const method=METHODS[id];entries.push({id,name:method.name,kind:method.kind,status,reason,
        requirements:Array.isArray(requirements)?requirements:[],priority:priority||0});
    }
    const phaseOK=x.supply==='ac3';
    if(is3&&phaseOK){
      add('dol',severeVoltageMismatch?'not_suitable':x.goal==='variable'?'conditional':'eligible',
        'Simple full-voltage starting; high inrush and mechanical shock are possible.',
        ['AC-3 contactor/combination starter rated for motor nameplate current, voltage and duty',
         'Motor overload, upstream short-circuit/ground-fault protection, disconnect and coordination',
         'Utility/site inrush limits, voltage dip and mechanical starting duty'], x.goal==='simple'?100:20);
      add('reversing',severeVoltageMismatch?'not_suitable':(x.reversing||x.goal==='reverse')?'eligible':'conditional',
        'Interlocked forward/reverse contactors for a motor permitted to reverse.',
        ['Mechanical and electrical contactor interlocks and permitted reversing duty',
         'Deceleration and stop before reversing where required by equipment'],x.goal==='reverse'?105:8);
      const ydPossible=!severeVoltageMismatch&&Number(x.leads)>=6&&delta&&Math.abs(volts-delta)/delta<=.055;
      add('wye_delta',ydPossible?(high?'conditional':'eligible'):'not_suitable',
        ydPossible?'Reduced-voltage start with approximately one-third DOL starting torque (idealized).':'Requires six accessible leads AND a nameplate delta RUN winding voltage matching the line supply; dual-voltage alone is not proof.',
        ['Confirm six-lead winding schematic and line-voltage delta run rating',
         'Three appropriately coordinated contactors, transition control, interlocks and overload',
         'Low-load/low-inertia start; verify transition surge and acceleration torque'],x.goal==='inrush'&&!high&&ydPossible?75:5);
      add('soft',severeVoltageMismatch?'not_suitable':high?'conditional':'eligible',
        'Smooth fixed-speed starting and/or stopping; not continuous variable-speed control.',
        ['Soft starter continuous line current at least motor FLA after ambient/altitude derating',
         'OEM starting-duty envelope: start current/time, starts/hour and heavy-duty thermal class',
         'External or integrated bypass as required; overload and short-circuit coordination'],x.goal==='inrush'&&!high?105:x.goal==='simple'?38:75);
      add('vfd',severeVoltageMismatch?'conditional':'eligible',
        'Adjustable-frequency speed/torque control with controlled acceleration; check motor/drive compatibility.',
        ['Drive output current at least nameplate FLA after derating, plus correct normal/heavy overload duty',
         'Input supply phase/voltage, motor insulation, cable length and dv/dt/filter requirements',
         'Motor cooling at low speed, EMC/harmonics, motor protection and safety functions'],x.goal==='variable'?120:x.goal==='torque'?115:60);
      add('auto',severeVoltageMismatch?'conditional':'conditional',
        'Reduced-voltage taps; starting torque decreases with voltage squared.',
        ['Autotransformer starter rated for motor duty, tap setting, transition and starts/hour',
         'Torque/current study and approved protection/coordination'],x.goal==='inrush'?55:8);
      add('part','not_suitable',
        'Only for motors explicitly wound and marked for part-winding starting.',
        ['Obtain motor manufacturer part-winding diagram, winding ratings and staged timing'],0);
    }else if(is3||sync){
      if(x.supply==='ac1'){
        add('vfd','conditional','A three-phase output VFD may be possible only when specifically rated for single-phase AC input at this voltage/current.',
          ['OEM single-phase input input-current and derating tables','Motor/control compatibility and protection'],105);
      }else if(x.supply==='dc'){
        add('vfd','conditional','A matched inverter with a manufacturer-approved DC input may be applicable; standard AC-input VFDs are not directly suitable.',
          ['DC bus voltage/current and protection','Manufacturer DC-input approval and commutation suitability'],90);
      }else{
        add('vfd','conditional','Synchronous/PMAC machine needs a drive/control strategy explicitly suitable for this motor.',
          ['Motor type, field/rotor design, feedback and startup method','Drive OEM confirmation of motor compatibility'],100);
      }
      add('dol','not_suitable',sync?'Synchronous-motor direct start is motor-specific; conventional induction DOL assumptions cannot be applied.':'Three-phase DOL needs a three-phase source.',[],0);
      add('wye_delta','not_suitable','Do not use conventional induction wye–delta sizing for this source/motor pairing.',[],0);
      add('soft','not_suitable','Conventional three-phase induction soft starter not established as suitable.',[],0);
    }
    if(single){
      add('dol',severeVoltageMismatch?'not_suitable':'eligible',
        'Line-rated magnetic starter may switch a single-phase motor; its start winding/capacitor circuit remains motor-specific.',
        ['Single-phase rated switching/overload and branch protection',
         'Motor internal start relay/centrifugal switch or manufacturer-approved start module'],x.goal==='simple'?105:70);
      if(x.family==='ac_cap_start_1')
        add('cap','eligible','The start capacitor, start winding and disconnect device are parts of the motor design—not a generic field-sized capacitor bank.',
          ['Use motor OEM capacitor µF and VAC ratings plus switch/relay type','Verify motor start-winding protection and replacement equivalence'],88);
      else if(x.family==='ac_cap_run_1')
        add('psc','eligible','PSC motors use a permanently connected run capacitor; start/control arrangement must follow motor design.',
          ['Manufacturer capacitor µF and VAC rating','Appropriate motor-compatible speed controller only when authorized'],82);
      else add('cap','conditional','A capacitor-start retrofit is not automatically suitable for another single-phase motor design.',
          ['Only use capacitor/start-relay kits specified for the exact motor'],0);
      add('vfd','conditional','Common 3-phase-output VFDs are NOT suitable for ordinary single-phase capacitor-start motors.',
        ['Use a controller expressly listed by the manufacturer for the exact single-phase motor type'],0);
      add('soft','conditional','A single-phase soft starter is possible only if the product is approved for this specific motor/start circuit.',
        ['OEM single-phase motor type compatibility and start-capacitor operation'],0);
      add('wye_delta','not_suitable','Wye–delta is not a single-phase motor starting method.',[],0);
    }
    if(dcBrush){
      add('dc_drive','eligible',
        'Armature-current-controlled DC drive matches rated voltage/current and motor field arrangement.',
        ['Continuous armature output current at least motor nameplate armature amps after derating',
         'Armature voltage range and field excitation/field-loss protection, where applicable',
         'Reversing/regeneration/braking and DC motor overload coordination'],x.goal==='variable'?125:100);
      add('dc_control',severeVoltageMismatch?'not_suitable':'conditional',
        'DC-rated contactor and properly engineered current-limiting start arrangement; DC arc interruption differs from AC.',
        ['DC utilization category and breaking capacity at actual DC voltage/current',
         'Armature inrush resistance/current limit and motor excitation sequence'],x.goal==='simple'?100:40);
      add('vfd','not_suitable','A standard induction-motor AC-output VFD cannot be connected directly to a brushed DC motor.',[],0);
      add('wye_delta','not_suitable','Wye–delta is an AC induction winding method, not DC control.',[],0);
      if(x.family==='dc_series') warnings.push('DC series motors may overspeed dangerously with insufficient load; validate the load, excitation and overspeed protection before selecting any controller.');
    }
    if(brushless){
      add('brushless','eligible','Requires the matched electronic commutation/servo controller and correct motor electrical/feedback characteristics.',
        ['Motor phases/back-EMF, DC bus and rated current/peak current',
         'Rotor position feedback/sensorless method and drive firmware',
         'Regeneration, braking, overload and manufacturer-matched harness'],120);
      add('vfd','conditional','A standard induction VFD is not a BLDC/servo controller unless its maker explicitly supports the motor.',
        ['Explicit motor family and commutation/feedback compatibility'],10);
      add('dol','not_suitable','BLDC motors require electronic commutation, not direct line energization.',[],0);
      add('wye_delta','not_suitable','Conventional wye–delta contactor starting does not replace electronic commutation.',[],0);
    }
    const selection=entries.filter(e=>e.status==='eligible'||e.status==='conditional')
      .sort((a,b)=>b.priority-a.priority);
    if(x.goal==='variable'&&selection[0]&&!['vfd','dc_drive','brushless'].includes(selection[0].id))
      warnings.push('Variable speed was requested, but no generally compatible adjustable-speed controller can be confirmed from these inputs. Check the OEM.');
    checks.push('Obtain motor nameplate voltage, rated FLA, power, frequency/speed, connection diagram and duty; use motor-specific data to verify all values.');
    checks.push('Choose a model with the applicable input voltage/phase and rated output current and overload envelope after ambient/altitude/enclosure derating.');
    checks.push('Check starting torque, locked-rotor current, acceleration/deceleration time, starts/hour, motor thermal capability and load inertia.');
    checks.push('Verify upstream OCPD, overload, disconnect, SCCR/AIC, contactor/drive coordination, grounding/bonding and Canadian certification.');
    checks.push('Confirm control voltage, run permissives, local/remote modes, interlocks, emergency stop/safe torque off as applicable, and documented commissioning tests.');
    if(x.supply==='ac3'&&is3)checks.push('For wye–delta, confirm six motor leads, DELTA RUN voltage, transition type, interlocked contactors and suitable low starting torque.');
    if(x.goal==='variable'||x.braking)checks.push('For VFD/DC drive, verify motor insulation/bearing protection, PWM/dv/dt, cooling, braking/regeneration and manufacturer-approved filters.');
    const calculations={
      nameplateFLA:rounded(motorAmps),
      continuousOutputMinimumA:rounded(motorAmps),
      apparentInputKva:acMotor?(x.supply==='ac3'?rounded(Math.sqrt(3)*motorAmps*motorVolts/1000):x.supply==='ac1'?rounded(motorAmps*motorVolts/1000):null):null,
      nominalDcKw:dcBrush?rounded(motorAmps*motorVolts/1000):null,
      motorOutputKw:hp?rounded(hp*0.745699872):null,
      motorRatedRpm:rpm?rpm:null,
      suppliedLraA:lra?rounded(motorAmps*lra):null,
      idealWyeDeltaStartingLineA:lra&&is3&&phaseOK&&Number(x.leads)>=6&&delta&&!severeVoltageMismatch?rounded(motorAmps*lra/3):null,
      insideDeltaWindingA:is3&&phaseOK&&delta&&!severeVoltageMismatch?rounded(motorAmps/Math.sqrt(3)):null,
      enteredCandidateCurrentA:candidateAmps?rounded(candidateAmps):null,
      afterDeratingCurrentA:candidateAmps?rounded(candidateAmps*deratingPct/100):null,
      candidatePassesContinuousFLA:candidateAmps?candidateAmps*deratingPct/100>=motorAmps:null
    };
    if(lra&&is3)warnings.push('Calculated locked-rotor and wye–delta current figures are rough comparisons based on your entered locked-rotor multiple; do not use them as equipment ratings.');
    if(is3&&delta&&phaseOK&&!severeVoltageMismatch)warnings.push('Inside-delta winding-current example is line current ÷ √3 only. Do not use it to select a soft starter without an OEM-approved inside-delta connection and rating table.');
    const recommended=selection.filter(x=>x.priority>0).slice(0,3);
    return {valid:true,errors:[],warnings,checks,methods:entries,calculations,
      recommendations:recommended,selectionBasis:'Method-level shortlist only — no manufacturer part number or branch protective device is selected.',
      familyName:FAMILIES[x.family],supplyType:x.supply,selectedGoal:x.goal,
      note:'Equipment sizing and CEC/OESC protection must be verified with current manufacturer tables and the authority having jurisdiction.'};
  }
  const api=Object.freeze({FAMILIES,METHODS,compute});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(global)global.EWBMotorSelector=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null);
