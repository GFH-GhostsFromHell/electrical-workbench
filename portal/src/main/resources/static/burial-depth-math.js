/* CEC 2024 / OESC: baseline table-selection and geometric excavation takeoff.
 * Independently reviewed against the 2024 Nexans Table 53 code-change presentation.
 * This is NOT a substitute for Table 53, ESA inspection or utility standards.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.EWBBurialDepth=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const table53={
    unarmoured:{ordinary:{low:600,high:750},vehicular:{low:900,high:1000}},
    armoured:{ordinary:{low:450,high:750},vehicular:{low:600,high:1000}},
    raceway:{ordinary:{low:450,high:750},vehicular:{low:600,high:1000}}
  };
  function n(value,label,min,max){
    if(value===null||value===undefined||value==='')throw Error(label+' is required.');
    const v=Number(value);
    if(!Number.isFinite(v)||v<min||v>max)throw Error(label+' must be between '+min+' and '+max+'.');
    return v;
  }
  function optional(value,label,min,max){
    if(value===undefined||value===null||value==='')return null;
    return n(value,label,min,max);
  }
  function calculate(input){
    if(!input||typeof input!=='object')throw Error('Select the installation details.');
    const voltage=n(input.voltage,'Circuit voltage',0,500000);
    const kind=input.kind==='dc'?'dc':'ac';
    const className=kind==='ac'?(voltage>1000?'high':'low'):(voltage>1500?'high':'low');
    const area=input.area==='vehicular'?'vehicular':'ordinary';
    const method=input.method;
    if(!Object.hasOwn(table53,method))throw Error('Select a listed wiring method.');
    const diameter=n(input.diameter,'Outside diameter',1,1000);
    const bedding=n(input.bedding,'Below-cable bedding',0,1000);
    const additional=optional(input.approvedMinimum,'Approved site/utility minimum cover',0,5000);
    const planned=optional(input.plannedCover,'Planned cover depth',0,6000);
    const owner=input.owner==='utility'?'utility':'private';
    const condition=['normal','rock','concrete','pool','shared','other'].includes(input.condition)?input.condition:'other';
    const base=table53[method][area][className];
    const hasApproved=additional!==null;
    const requirement=Math.max(base,hasApproved?additional:0);
    const floorDepth=requirement+diameter+bedding;
    const plannedFloor=planned===null?null:planned+diameter+bedding;
    const alerts=[];
    const needsEngineering=(className==='high'||owner==='utility'||condition!=='normal');
    if(className==='high'){
      alerts.push('HIGH VOLTAGE: Section 36 modifies general wiring rules. Confirm the shielded-cable system, ducts, separations, terminations, ampacity and site engineering documents.');
    }
    if(owner==='utility'){
      alerts.push('UTILITY FACILITY: The distributor/owner construction standard, Regulation 22/04, and approved civil drawings control the final installation; the CEC figure is only a reference until confirmed.');
    }
    if(condition==='rock') alerts.push('ROCK: special rock-trench provisions may apply. Do not reduce cover automatically; obtain the approved detail and ESA/utility acceptance.');
    if(condition==='concrete')alerts.push('CONCRETE / BUILDING: slab, encasement, footing and structural conditions require the applicable specific rule or approved drawing. This calculation makes no depth reduction.');
    if(condition==='pool')alerts.push('POOL / SPA: also check CEC Section 68 and Table 61 for horizontal separation; burial depth alone does not establish compliance.');
    if(condition==='shared')alerts.push('SHARED TRENCH / CROSSING: verify gas, telecom, water and other service separations, crossings and utility-required barriers before construction.');
    if(condition==='other')alerts.push('SPECIAL CONDITIONS: obtain an installation-specific design or inspector/utility ruling before relying on the baseline.');
    if(hasApproved&&additional<base)alerts.push('The entered site standard is shallower than the Table 53 reference. The tool does not treat it as an approved relaxation or variance.');
    if(owner==='utility'&&!hasApproved)alerts.push('No utility-approved cover depth was entered. The final excavation depth remains pending verification of the utility construction standard.');
    alerts.push('Measure cover vertically from FINAL finished grade to the TOP of the installed cable or raceway, not to its centreline or bottom.');
    alerts.push('Before excavation, obtain utility locates, including separate private locates where necessary. Verify approved bedding/backfill, warning/marker tape and inspection before concealment.');
    alerts.push('Ampacity tables may assume a different burial depth, spacing, soil thermal resistivity or cable arrangement; check Appendix D, IEEE 835 or the project cable rating study.');
    const status=planned===null?'unmeasured':planned<requirement?'below-reference':'at-or-above-reference';
    return Object.freeze({
      voltage,kind,classification:className,area,method,owner,condition,
      table53CoverMm:base,approvedMinimumMm:additional,
      referenceCoverMm:requirement,diameterMm:diameter,beddingMm:bedding,
      estimatedTrenchBottomMm:floorDepth,plannedCoverMm:planned,
      plannedTrenchBottomMm:plannedFloor,deltaMm:planned===null?null:planned-requirement,
      status,needsEngineering,alerts
    });
  }
  return {table53,calculate};
});
