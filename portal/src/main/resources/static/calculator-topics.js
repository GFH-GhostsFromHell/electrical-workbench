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
  const L=(label,url,purpose='')=>({label,url,purpose});
  const topics=[];
  const add=(id,name,group,description,terms,primary,alternatives=[],findable=true)=>{
    topics.push({id,name,group,description,terms,primary,alternatives,findable});
  };
  add('conductor','Conductor ampacity and derating','Conductors & Wiring','Size conductors and review correction factors, terminal limits, continuous loading and OCPD.','wire cable table 5a 5c 4-006 60c 75c 90c sizing',
    L('Guided conductor sizing',G('ampacity')),[],false);
  add('voltage','Voltage drop and maximum length','Conductors & Wiring','Find conductor size, circuit drop, maximum run, K factor or circular-mil area.','vd voltage drop d3 k factor appendix d maximum length',
    L('Guided circuit sizing',G('conductor')),[L('Maximum length, K factor or circular mils',G('d3'),'Use when you need to solve for length, circular mil area, or K instead of choosing a conductor size.')],false);
  add('busbar','Busbar sizing and parallel straps','Conductors & Wiring','Busbar worksheet ampacity, width, thickness and parallel bar quantity.','bus bars busbars straps copper aluminum current density 4-036',
    L('Current from bar dimensions',C('s4',1)),[L('Required width or thickness',C('s4',2),'Find the minimum bar dimensions for a given current.'),L('Number of parallel bars',C('s4',3),'Calculate a proposed quantity of parallel straps.'),L('Current density worksheet',C('s4',4),'Use a specified current-density design value.')]);
  add('neutral','Neutral current / conductor sizing','Conductors & Wiring','Split-phase imbalance and 3-phase 4-wire vector neutral calculations.','347 600 120 240 3phase vector neutral harmonic',
    L('Guided neutral sizing',G('neutral')),[],false);
  add('grounding','Grounding and bonding','Conductors & Wiring','Select grounding or bonding path and verify electrode or conductor geometry.','electrode rod plate ring bond ground secondary jumper section 10',
    L('Guided grounding and bonding',G('ground')),[L('Rod, ground plate and ring geometry',A('ground'),'Calculate physical electrode dimensions and area; this is different from conductor sizing.')],false);
  add('conduit-fill','Conduit fill','Conductors & Wiring','Find conductor and raceway fill calculation worksheets.','pipe pvc emt fill conductor count wiring raceway',
    L('Conduit fill',C('s12',0)));
  add('box-fill','Outlet and junction box fill','Conductors & Wiring','Calculate conductor volume and box-fill allowances.','junction box cubic volume conductor device fill',
    L('Box fill',C('s12',1)),[]);
  add('pull-box','Pull box dimensions','Conductors & Wiring','Straight, angle, U and back-wall pull dimensions.','12-3036 junction pull',
    L('Dedicated pull-box sizing','/pull-box-calcs.html'),[],false);
  add('supports','Conduit supports and cable straps','Conductors & Wiring','Estimate support spacing and fastening points for straight runs.','emt pvc bx ac90 nmd90 fastening straps supports',
    L('Conduit supports',C('s12',5)),[L('Cable straps (BX, AC90, NMD90)',C('s12',4),'Different installation: estimate cable fasteners rather than conduit supports.')]);
  add('tap','Tap conductors and splitter rules','Motors & Protection','Review feeder taps, splitter conductors, and protective-device requirements.','one third 1/3 tap 3 m 7.5 m fuse breaker feeder',
    L('Section 14 tap / splitter',C('s14',0)),[L('Motor-specific tap check',G('motor'),'Use the motor/splitter tap path with motor current and tap length.')]);
  add('motors','Motor protection and overload','Motors & Protection','AC/DC motor conductors, overloads, breakers and starting checks.','flc fla ocpd motors starters section 28',
    L('AC motor protection',C('s28',0)),[L('DC motor branch circuit',C('s28',1),'Use for DC motors instead of AC induction motors.'),L('Select a VFD, starter or soft starter','/motor-starter-selector.html','Choose and compare controllers, not branch overcurrent protection.')],false);
  add('multi-motor','Multiple motor feeder','Motors & Protection','Calculate feeder conductor and OCPD for several motors, including simultaneous start.','28-204 motor feeder largest simultaneous start motors',
    L('Multiple motors · Section 28',C('s28',2)),[]);
  add('transformer','Transformer sizing / protection','Motors & Protection','Primary/secondary currents, protection, transformer banks and impedance.','kva 600 208 4160 volts xfmr fusing transformer fault current',
    L('Guided transformer sizing',G('xfmr')),[L('Dry-type transformer installation',C('s26',1),'Check the equipment-installation worksheet.'),L('Medium-voltage transformer',C('s26',2),'Use the high-voltage-specific worksheet when applicable.')],false);
  add('capacitor','Capacitors / power factor','Motors & Protection','Calculate kVAR capacitor banks and power-factor correction.','pf reactive kvar power factor capacitor banks',
    L('Power factor correction',C('s26',5)),[L('Capacitor bank installation',C('s26',4),'Use when sizing a bank rather than solving for power factor.')]);
  add('drives','Starter, VFD and soft starter','Motors & Protection','Compare DOL, wye-delta, soft starting and variable-frequency drives.','motor starter star delta ac dc vfd drive softstart',
    L('Motor drive selector','/motor-starter-selector.html'),[],false);
  add('service','Service demand / occupancy','Services & Equipment','Residential, apartment, hotel, school, hospital and industrial demand.','dwelling apartments hotel school hospital section 8 commercial industrial',
    L('Guided service demand',G('service')),[L('Occupancy-specific demand (Section 8)',C('s8',0),'Use when the occupancy has dedicated demand factors or additional load rules.')],false);
  add('refrigeration','Refrigeration / HVAC compressors','Services & Equipment','RLA, LRA, MCA and MOCP worksheets for compressors and refrigeration equipment.','air conditioner compressor refrigeration hvac mca mocp',
    L('Guided refrigeration',G('refrig')),[L('Verify marked MCA and MOCP',A('hvac'),'Use the equipment nameplate instead of estimating a group of compressors.')],false);
  add('heating','Electric heating / continuous load','Services & Equipment','Electric heater current, continuous-load factor and protection.','electric heater watts space heating 208 volt section 62',
    L('Electric heating worksheet',A('hvac')),[]);
  add('firepump','Fire pump feeder','Services & Equipment','Motor and jockey-pump conductor plus controller/protection checks.','fire pumps jockey locked rotor section 32',
    L('Guided fire pump',G('firepump')),[],false);
  add('firealarm','Fire-alarm power / EOL','Services & Equipment','End-of-line resistor, NAC device current, battery and voltage drop.','fire alarm class a class b nac 24v 3.9k battery standby resistor',
    L('Guided fire alarm',G('firealarm')),[],false);
  add('welders','Welder duty cycle / feeder','Services & Equipment','Single- and multiple-welder demand and protection worksheets.','welders welding arc resistance 42a 42b 42c duty cycle',
    L('Single welder',C('s42',0)),[L('Multiple-welder feeder',C('s42',1),'Apply multi-unit demand and duty-cycle adjustments rather than a single welder.')]);
  add('class-circuits','Class 1 / Class 2 circuits','Services & Equipment','Power-limited and low-voltage control-circuit worksheets.','section 16 class one class two 24 volt low voltage',
    L('Section 16 circuit',C('s16',0)));
  add('patient-care','Patient care / isolated systems','Services & Equipment','Healthcare electrical environments and isolated-system worksheets.','hospital medical isolated patient care section 24',
    L('Patient-care environment',C('s24',0)),[L('Isolated power systems',C('s24',1),'Different patient-care worksheet for isolated electrical systems.')]);
  add('cec-reference','CEC sections and general reference','Code & Reference','Find Section 2 reminders and full section-organized worksheets.','cec canadian electrical code oesc 2024 rules 2 4 8 10 12 14 16 24 26 28 32 42',
    L('CEC Section 2 general',C('s2')));
  add('relay','Protection / relay calculations','Code & Reference','Industrial current-transformer ratios, relay pickup and commissioning.','ct pt instrument 4-20ma trip protection',
    L('Protection and relay tools','/industrial-commissioning.html'),[],false);
  return Object.freeze(topics.map(t=>Object.freeze(t)));
});