import { Types, PluginValidateFn, PluginFunction } from '@graphql-codegen/plugin-helpers';
import { visit, GraphQLSchema, concatAST, Kind, FragmentDefinitionNode } from 'graphql';
import { RawClientSideBasePluginConfig } from '@graphql-codegen/visitor-plugin-common';
import { StencilApolloVisitor } from './visitor';
import { extname } from 'path';

export enum StencilComponentType {
  functional = 'functional',
  class = 'class',
}

export interface StencilApolloRawPluginConfig extends RawClientSideBasePluginConfig {
  /**
   * @name componentType
   * @type functional / class
   * @description Customize the output of the plugin - you can choose to generate a Component class or a function component.
   * @default functional
   *
   * @example
   * ```yml
   * generates:
   * path/to/file.ts:
   *  plugins:
   *    - typescript
   *    - typescript-operations
   *    - typescript-stencil-apollo
   *  config:
   *    componentType: class
   * ```
   */
  componentType?: StencilComponentType;
}

export const plugin: PluginFunction<StencilApolloRawPluginConfig> = (schema: GraphQLSchema, documents: Types.DocumentFile[], config: StencilApolloRawPluginConfig) => {
  const allAst = concatAST(
    documents.reduce((prev, v) => {
      return [...prev, v.content];
    }, [])
  );
  const operationsCount = allAst.definitions.filter(d => d.kind === Kind.OPERATION_DEFINITION);

  if (operationsCount.length === 0) {
    return '';
  }

  const allFragments = allAst.definitions.filter(d => d.kind === Kind.FRAGMENT_DEFINITION) as FragmentDefinitionNode[];
  const visitor = new StencilApolloVisitor(allFragments, config) as any;
  const visitorResult = visit(allAst, { leave: visitor });

  return [visitor.getImports(), visitor.fragments, ...visitorResult.definitions.filter(t => typeof t === 'string')].join('\n');
};

export const validate: PluginValidateFn<any> = async (schema: GraphQLSchema, documents: Types.DocumentFile[], config: StencilApolloRawPluginConfig, outputFile: string) => {
  if (extname(outputFile) !== '.tsx') {
    throw new Error(`Plugin "stencil-apollo" requires extension to be ".tsx"!`);
  }
};
