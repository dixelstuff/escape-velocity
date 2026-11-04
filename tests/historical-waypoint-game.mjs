import {Game} from '../static/engine.mjs';
/** Frozen publication fixtures predate fixed-destination rescue. Keep their exact
 * recorded rules; current gameplay is exercised by the ordinary Game and API tests.
 * A fixture with an explicit newer rule retains that rule.
 */
export class HistoricalWaypointGame extends Game {
 constructor(e,start,target,threshold,settings={}){
  super(e,start,target,threshold,{...settings,waypoint_rescue:settings.waypoint_rescue??false});
 }
}
