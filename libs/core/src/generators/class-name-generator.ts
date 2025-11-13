import { StylesGenerator } from './styles-generator';
import { StyledParams } from '../types';

export class ClassNameGenerator<const STYLE_PARAMS extends StyledParams = StyledParams> extends StylesGenerator<STYLE_PARAMS> {
  constructor(public _params: STYLE_PARAMS) {
    super(_params);
  }

  override get priority(): number {
    if (this.params.priority) return this.params.priority;
    return 0;
  }
}
