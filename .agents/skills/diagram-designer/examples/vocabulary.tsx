// @live
import { Page } from '@flanksource/facet';
import { VOCABULARY_CATALOG } from './vocabulary/catalog';
import { BoxStyles, BoxColors, BoxDensities, BoxTagVariants, LineStyles, LineColors, LineDensities } from './vocabulary/boxes-and-lines';
import { CanvasBackgrounds, CanvasFrames, ContainerStyles, ContainerColors, ContainerDensities, ActorStyles, ActorColors, ActorDensities } from './vocabulary/canvas-containers-actors';
import { RailStyles, CalloutStyles, RailTypes, RailColors } from './vocabulary/rails-and-callouts';
import { ProtocolInterfaces, ProtocolFlows, ArchitectureElements } from './vocabulary/protocols-and-elements';
import { AuthorizationModels } from './vocabulary/authorization';

const examples = {
  'box-styles': BoxStyles, 'box-colors': BoxColors, 'box-density': BoxDensities, 'box-tags': BoxTagVariants,
  'line-styles': LineStyles, 'line-colors': LineColors, 'line-density': LineDensities,
  'protocol-interfaces': ProtocolInterfaces, 'protocol-flows': ProtocolFlows, 'architecture-elements': ArchitectureElements,
  'authorization-models': AuthorizationModels,
  'canvas-backgrounds': CanvasBackgrounds, 'canvas-frames': CanvasFrames,
  'container-styles': ContainerStyles, 'container-colors': ContainerColors, 'container-density': ContainerDensities,
  'actor-styles': ActorStyles, 'actor-colors': ActorColors, 'actor-density': ActorDensities,
  'rail-styles': RailStyles, 'callout-styles': CalloutStyles, 'rail-types': RailTypes, 'rail-colors': RailColors,
} satisfies Record<(typeof VOCABULARY_CATALOG)[number]['key'], () => React.ReactNode>;

export default function Vocabulary() {
  return (
    <>
      {VOCABULARY_CATALOG.map(({ key, title }) => {
        const Example = examples[key];
        return <Page key={key} id={`vocabulary-${key}`} title={title}><Example /></Page>;
      })}
    </>
  );
}
