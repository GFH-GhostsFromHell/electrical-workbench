/* Single authoritative task directory for the calculator hub and tool search. */
(function(root,build){
  'use strict';
  const entries=build();
  if(typeof module==='object'&&module.exports)module.exports=entries;
  root.EWBCalculatorTopics=entries;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const G=id=>'/guided-calculators.html?tool='+id;
  const C=(section,tab)=>'/calculators.html?section='+section+(tab===undefined?'':'&tab='+tab);
  const A=id=>'/advanced-calculations.html?tool='+id;
  const L=(label,url)=>({label,url});
  const topics=[];
  const add=(id,name,group,description,terms,primary,alternatives=[],findable=true)=>{
    topics.push({id,name,group,description,terms,primary,alternatives,findable});
  };
  add('conductor','Conductor ampacity and derating','Conductors & Wiring','Size conductors and review correction factors, terminal limits, continuous loading and OCPD.','wire cable table 5a 5c 4-006 60c 75c 90c sizing',
    L('Guided conductor sizing',G('ampacity')),[L('Detailed derating',A('derating')),L('Section 4 review',C('s4',0))],false);
  add('voltage','Voltage drop and maximum length','Conductors & Wiring','Find conductor size, circuit drop, maximum run, K factor or circular-mil area.','vd voltage drop d3 k factor appendix d maximum length',
    L('Guided circuit sizing',G('conductor')),[L('K factor / Table D3',G('d3')),L('Circuit worksheet','/circuit-sizing.html')],false);
  add('busbar','Busbar sizing and parallel straps','Conductors & Wiring','Busbar worksheet ampacity, width, thickness and parallel bar quantity.','bus bars busbars straps copper aluminum current density 4-036',
    L('Busbar ampacity',C('s4',1)),[L('Required dimensions',C('s4',2)),L('Parallel strap count',C('s4',3)),L('Current density',C('s4',4))]);
  add('neutral','Neutral current / conductor sizing','Conductors & Wiring','Split-phase imbalance and 3-phase 4-wire vector neutral calculations.','347 600 120 240 3phase vector neutral harmonic',
    L('Guided neutral sizing',G('neutral')),[L('Formula worksheet',A('neutral'))],false);
  add('grounding','Grounding and bonding','Conductors & Wiring','Select grounding or bonding path and verify electrode or conductor geometry.','electrode rod plate ring bond ground secondary jumper section 10',
    L('Guided grounding and bonding',G('ground')),[L('Electrode geometry',A('ground'))],false);
  add('conduit-fill','Conduit fill','Conductors & Wiring','Find conductor and raceway fill calculation worksheets.','pipe pvc emt fill conductor count wiring raceway',
    L('Conduit fill',C('s12',0)));
  add('box-fill','Outlet and junction box fill','Conductors & Wiring','Calculate conductor volume and box-fill allowances.','junction box cubic volume conductor device fill',
    L('Box fill',C('s12',1)),[L('Pull-box dimensions','/pull-box-calcs.html')]);
  add('pull-box','Pull box dimensions','Conductors & Wiring','Straight, angle, U and back-wall pull dimensions.','12-3036 junction pull',
    L('Dedicated pull-box sizing','/pull-box-calcs.html'),[L('Section 12 worksheet',C('s12',2))],false);
  add('supports','Conduit supports and cable straps','Conductors & Wiring','Estimate support spacing and fastening points for straight runs.','emt pvc bx ac90 nmd90 fastening straps supports',
    L('Conduit supports',C('s12',5)),[L('Cable strap count',C('s12',4))]);
  add('tap','Tap conductors and splitter rules','Motors & Protection','Review feeder taps, splitter conductors, and protective-device requirements.','one third 1/3 tap 3 m 7.5 m fuse breaker feeder',
    L('Section 14 tap / splitter',C('s14',0)),[L('Guided motor tap',G('motor')),L('Section 28 motor tap',C('s28',3))]);
  add('motors','Motor protection and overload','Motors & Protection','AC/DC motor conductors, overloads, breakers and starting checks.','flc fla ocpd motors starters section 28',
    L('AC motor protection',C('s28',0)),[L('DC motor protection',C('s28',1)),L('Starter / VFD selection','/motor-starter-selector.html')],false);
  add('multi-motor','Multiple motor feeder','Motors & Protection','Calculate feeder conductor and OCPD for several motors, including simultaneous start.','28-204 motor feeder largest simultaneous start motors',
    L('Multiple motors · Section 28',C('s28',2)),[L('Detailed feeder formula',A('motor'))]);
  add('transformer','Transformer sizing / protection','Motors & Protection','Primary/secondary currents, protection, transformer banks and impedance.','kva 600 208 4160 volts xfmr fusing transformer fault current',
    L('Guided transformer sizing',G('xfmr')),[L('Section 26 options',C('s26',0)),L('Fault / bank worksheet',A('xfmr'))],false);
  add('capacitor','Capacitors / power factor','Motors & Protection','Calculate kVAR capacitor banks and power-factor correction.','pf reactive kvar power factor capacitor banks',
    L('Power factor correction',C('s26',5)),[L('Capacitor bank sizing',C('s26',4))]);
  add('drives','Starter, VFD and soft starter','Motors & Protection','Compare DOL, wye-delta, soft starting and variable-frequency drives.','motor starter star delta ac dc vfd drive softstart',
    L('Motor drive selector','/motor-starter-selector.html'),[],false);
  add('service','Service demand / occupancy','Services & Equipment','Residential, apartment, hotel, school, hospital and industrial demand.','dwelling apartments hotel school hospital section 8 commercial industrial',
    L('Guided service demand',G('service')),[L('CEC Section 8 worksheets',C('s8',0)),L('Six-component load worksheet',A('service'))],false);
  add('refrigeration','Refrigeration / HVAC compressors','Services & Equipment','RLA, LRA, MCA and MOCP worksheets for compressors and refrigeration equipment.','air conditioner compressor refrigeration hvac mca mocp',
    L('Guided refrigeration',G('refrig')),[L('Nameplate MCA / MOCP',A('hvac')),L('CEC Section 28',C('s28',4))],false);
  add('heating','Electric heating / continuous load','Services & Equipment','Electric heater current, continuous-load factor and protection.','electric heater watts space heating 208 volt section 62',
    L('Electric heating worksheet',A('hvac')),[L('Continuous-load conductor sizing',G('ampacity'))]);
  add('firepump','Fire pump feeder','Services & Equipment','Motor and jockey-pump conductor plus controller/protection checks.','fire pumps jockey locked rotor section 32',
    L('Guided fire pump',G('firepump')),[L('Section 32 detailed worksheet',A('firepump'))],false);
  add('firealarm','Fire-alarm power / EOL','Services & Equipment','End-of-line resistor, NAC device current, battery and voltage drop.','fire alarm class a class b nac 24v 3.9k battery standby resistor',
    L('Guided fire alarm',G('firealarm')),[L('Battery/NAC/voltage drop',A('firealarm'))],false);
  add('welders','Welder duty cycle / feeder','Services & Equipment','Single- and multiple-welder demand and protection worksheets.','welders welding arc resistance 42a 42b 42c duty cycle',
    L('Single welder',C('s42',0)),[L('Multiple-welder feeder',C('s42',1))]);
  add('class-circuits','Class 1 / Class 2 circuits','Services & Equipment','Power-limited and low-voltage control-circuit worksheets.','section 16 class one class two 24 volt low voltage',
    L('Section 16 circuit',C('s16',0)));
  add('patient-care','Patient care / isolated systems','Services & Equipment','Healthcare electrical environments and isolated-system worksheets.','hospital medical isolated patient care section 24',
    L('Patient-care environment',C('s24',0)),[L('Isolated systems',C('s24',1))]);
  add('cec-reference','CEC sections and general reference','Code & Reference','Find Section 2 reminders and full section-organized worksheets.','cec canadian electrical code oesc 2024 rules 2 4 8 10 12 14 16 24 26 28 32 42',
    L('CEC Section 2 general',C('s2')));
  add('relay','Protection / relay calculations','Code & Reference','Industrial current-transformer ratios, relay pickup and commissioning.','ct pt instrument 4-20ma trip protection',
    L('Protection and relay tools','/industrial-commissioning.html'),[],false);
  return Object.freeze(topics.map(t=>Object.freeze(t)));
});