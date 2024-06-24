# marked-extended-tables

Extends the standard [Github-Flavored tables](https://github.github.com/gfm/#tables-extension-) to support advanced features:

  - Column Spanning
  - Row Spanning
  - Multi-row headers

# Usage

```js
import { marked } from "marked";
import extendedTable from "@fsegurai/marked-extended-tables";

// or UMD script
// <script src="https://cdn.jsdelivr.net/npm/marked/lib/marked.umd.js"></script>
// <script src="https://cdn.jsdelivr.net/npm/marked-extended-tables/lib/index.umd.js"></script>

marked.use(extendedTable());

marked(`
      | H1      | H2      | H3      |
      |---------|---------|---------|
      | This cell spans 3 columns |||
    `);

/**
 * <table>
 *  <thead>
 *    <tr>
 *      <th>H1</th>
 *      <th>H2</th>
 *      <th>H3</th>
 *    </tr>
 *  </thead>
 *  <tbody>
 *  <tr>
 *    <td colspan="3">This cell spans 3 columns</td>
 *  </tr>
 *  </tbody>
 * </table>
 */
```

## Column Spanning
Easily denote cells that should span multiple columns by grouping multiple pipe `|` characters at the end of the cell:

```
| H1      | H2      | H3      |
|---------|---------|---------|
| This cell spans 3 columns |||
```

## Row Spanning
Easily denote cells that should span across the previous row by inserting a caret `^` character immediately before the closing pipes:

```
| H1           | H2      |
|--------------|---------|
| This cell    | Cell A  |
| spans three ^| Cell B  |
| rows        ^| Cell C  |
```

Cell contents across rows will be concatenated together with a single whitespace character ` `. Note that cells can only span multiple rows if they have the same column span.

## Multi-row headers
Headers can now follow the same structure as cells, to include multiple rows, and also support row and column spans.

```
| This header spans two   || Header A |
| columns *and* two rows ^|| Header B |
|-------------|------------|----------|
| Cell A      | Cell B     | Cell C   |
```