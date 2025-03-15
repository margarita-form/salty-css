export interface ValueParserReturnValue {
  transformed: string;
  additionalCss?: object[];
}

type StyleValueModifierFunctionReturnValue = undefined | ValueParserReturnValue;

export type SyncronousStyleValueModifierFunction = (current: string) => StyleValueModifierFunctionReturnValue;

export type StyleValueModifierFunction = (current: string) => Promise<StyleValueModifierFunctionReturnValue> | StyleValueModifierFunctionReturnValue;
