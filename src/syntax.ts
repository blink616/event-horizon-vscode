import { palette as p, type HexColor } from './palette.js';
import type { SemanticStyle, TokenRule, TokenStyle } from './types.js';

// Syntax: TextMate scopes
const rule = (name: string, scope: string[], fg: HexColor, fontStyle?: TokenStyle): TokenRule => ({
  name,
  scope,
  settings: fontStyle ? { foreground: fg, fontStyle } : { foreground: fg },
});

export const tokenColors: TokenRule[] = [
  rule('Comments', ['comment', 'punctuation.definition.comment', 'string.comment'], p.comment),
  rule(
    'Doc tags',
    [
      'comment keyword',
      'comment storage.type',
      'storage.type.class.jsdoc',
      'entity.name.type.instance.jsdoc',
    ],
    p.fgMuted,
    'italic',
  ),

  rule(
    'Keywords & storage',
    [
      'keyword',
      'storage.type',
      'storage.modifier',
      'keyword.control',
      'keyword.other.using',
      'keyword.other.import',
    ],
    p.violet,
  ),
  rule(
    'Operators',
    ['keyword.operator', 'punctuation.separator.key-value', 'storage.type.function.arrow'],
    p.fgMuted,
  ),
  rule(
    'Word operators',
    [
      'keyword.operator.new',
      'keyword.operator.expression',
      'keyword.operator.logical.python',
      'keyword.operator.wordlike',
    ],
    p.violet,
  ),

  rule(
    'Strings',
    ['string', 'string.quoted', 'string.template', 'punctuation.definition.string'],
    p.string,
  ),
  rule(
    'Template interpolation',
    ['punctuation.definition.template-expression', 'punctuation.section.embedded'],
    p.violet,
  ),
  rule(
    'Escapes & regex',
    ['constant.character.escape', 'string.regexp', 'constant.other.character-class.regexp'],
    p.cyan,
  ),

  rule(
    'Numbers & constants',
    ['constant.numeric', 'constant.language', 'constant.other', 'support.constant'],
    p.rose,
  ),
  rule(
    'Booleans & null',
    ['constant.language.boolean', 'constant.language.null', 'constant.language.undefined'],
    p.rose,
    'italic',
  ),

  rule(
    'Functions',
    [
      'entity.name.function',
      'support.function',
      'meta.function-call entity.name.function',
      'variable.function',
    ],
    p.gold,
  ),
  rule('Built-in functions', ['support.function.builtin', 'support.function.go'], p.gold, 'italic'),

  rule(
    'Types & classes',
    [
      'entity.name.type',
      'entity.name.class',
      'support.type',
      'support.class',
      'entity.other.inherited-class',
      'storage.type.primitive',
    ],
    p.ice,
  ),
  rule(
    'Namespaces & packages',
    ['entity.name.namespace', 'entity.name.package', 'entity.name.module'],
    p.ice,
    'italic',
  ),

  rule(
    'Variables',
    ['variable', 'variable.other.readwrite', 'variable.other.constant', 'meta.definition.variable'],
    p.cyan,
  ),
  rule('Parameters', ['variable.parameter'], p.cyan),
  rule(
    'Properties',
    [
      'variable.other.property',
      'variable.other.object.property',
      'variable.other.constant.property',
      'support.variable.property',
      'meta.object-literal.key',
      'entity.name.tag.yaml',
    ],
    p.nebula,
  ),
  rule(
    'this / self',
    ['variable.language.this', 'variable.language.self', 'variable.language.super'],
    p.violet,
    'italic',
  ),

  rule(
    'Punctuation',
    ['punctuation', 'meta.brace', 'punctuation.terminator', 'punctuation.separator'],
    p.fgFaint,
  ),

  // Markup
  rule('Tags', ['entity.name.tag', 'punctuation.definition.tag'], p.violet),
  rule('Component tags', ['support.class.component', 'entity.name.tag.component'], p.ice),
  rule('Attributes', ['entity.other.attribute-name'], p.ice, 'italic'),
  rule(
    'CSS selectors',
    [
      'entity.other.attribute-name.class.css',
      'entity.other.attribute-name.id.css',
      'entity.name.tag.css',
    ],
    p.ice,
  ),
  rule(
    'CSS properties',
    ['support.type.property-name.css', 'support.type.vendored.property-name'],
    p.nebula,
  ),
  rule('CSS values & units', ['support.constant.property-value.css', 'keyword.other.unit'], p.rose),

  // Data keys share the property color at every nesting level.
  rule('JSON keys', ['support.type.property-name.json'], p.nebula),

  // Markdown
  rule(
    'MD headings',
    ['markup.heading', 'entity.name.section.markdown', 'punctuation.definition.heading.markdown'],
    p.violet,
    'bold',
  ),
  rule('MD bold', ['markup.bold'], p.fg, 'bold'),
  rule('MD italic', ['markup.italic'], p.ice, 'italic'),
  rule('MD code', ['markup.inline.raw'], p.gold),
  rule('MD links', ['markup.underline.link', 'string.other.link'], p.gold),
  rule('MD quote', ['markup.quote'], p.comment),
  rule('MD lists', ['punctuation.definition.list.begin.markdown'], p.violet),

  // Diff
  rule('Inserted', ['markup.inserted'], p.added),
  rule('Deleted', ['markup.deleted'], p.error),
  rule('Changed', ['markup.changed'], p.gold),

  rule('Invalid', ['invalid', 'invalid.illegal'], p.error, 'underline'),
  rule('Deprecated', ['invalid.deprecated'], p.fgMuted, 'strikethrough'),
];

// Semantic tokens (language-server aware): keep in sync with the rules above
export const semanticTokenColors = {
  function: p.gold,
  method: p.gold,
  'function.defaultLibrary': { foreground: p.gold, italic: true },
  class: p.ice,
  interface: p.ice,
  type: p.ice,
  typeParameter: { foreground: p.ice, italic: true },
  enum: p.ice,
  enumMember: p.rose,
  namespace: { foreground: p.ice, italic: true },
  parameter: p.cyan,
  property: p.nebula,
  variable: p.cyan,
  'variable.readonly': p.cyan,
  'variable.defaultLibrary': p.cyan,
  'property.readonly': p.nebula,
  keyword: p.violet,
  decorator: { foreground: p.cyan, italic: true },
  '*.deprecated': { strikethrough: true },
} satisfies Record<string, HexColor | SemanticStyle>;
