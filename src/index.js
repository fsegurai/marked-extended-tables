export default function () {
  return {
    extensions: [
      {
        name: "spanTable",
        level: "block",
        start(src) {
          return src.match(/^\n *([^\n ].*\|.*)\n/)?.index;
        },
        tokenizer(src, tokens) {
          const regex = new RegExp(
            "^ *([^\\n ].*\\|.*\\n(?: *[^\\s].*\\n)*?)" + // Header
              " {0,3}(?:\\| *)?(:?-+:? *(?:\\| *:?-+:? *)*)(?:\\| *)?" + // Align
              "(?:\\n((?:(?! *\\n| {0,3}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})" + // Cells
              "(?:\\n+|$)| {0,3}#{1-6} | {0,3}>| {4}[^\\n]| {0,3}(?:`{3,}" +
              "(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n| {0,3}(?:[*+-]|1[.)]) |" +
              "<\\/?(?:address|article|aside|base|basefont|blockquote|body|" +
              "caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?: +|\\n|\\/?>)|<(?:script|pre|style|textarea|!--)).*(?:\\n|$))*)\\n*|$)"
          );

          const cap = regex.exec(src);

          if (cap) {
            const item = {
              type: "spanTable",
              header: cap[1].replace(/\n$/, "").split("\n"),
              align: cap[2].replace(/^ *|\| *$/g, "").split(/ *\| */),
              rows: cap[3] ? cap[3].replace(/\n$/, "").split("\n") : [],
              raw: cap[0],
            };

            item.header[0] = splitCells(item.header[0]);

            const colCount = item.header[0].reduce(
              (length, header) => length + header.colspan,
              0
            );

            if (colCount === item.align.length) {
              // Process alignments
              item.align = item.align.map((align) => {
                if (/^ *-+: *$/.test(align)) return "right";
                if (/^ *:-+: *$/.test(align)) return "center";
                if (/^ *:-+ *$/.test(align)) return "left";
                return null;
              });

              // Process remaining header rows
              for (let i = 1; i < item.header.length; i++) {
                item.header[i] = splitCells(
                  item.header[i],
                  colCount,
                  item.header[i - 1]
                );
              }

              // Process main table cells
              for (let i = 0; i < item.rows.length; i++) {
                item.rows[i] = splitCells(
                  item.rows[i],
                  colCount,
                  item.rows[i - 1]
                );
              }

              // Tokenize header cells
              item.header.forEach((row) => {
                row.forEach((cell) => {
                  cell.tokens = [];
                  this.lexer.inline(cell.text, cell.tokens);
                });
              });

              // Tokenize body cells
              item.rows.forEach((row) => {
                row.forEach((cell) => {
                  cell.tokens = [];
                  this.lexer.inline(cell.text, cell.tokens);
                });
              });

              return item;
            }
          }
        },
        renderer(token) {
          let output = "<table>";
          output += "<thead>";
          token.header.forEach((row) => {
            output += "<tr>";
            let col = 0;
            row.forEach((cell) => {
              const text = this.parser.parseInline(cell.tokens);
              output += getTableCell(text, cell, "th", token.align[col]);
              col += cell.colspan;
            });
            output += "</tr>";
          });
          output += "</thead>";
          if (token.rows.length) {
            output += "<tbody>";
            token.rows.forEach((row) => {
              output += "<tr>";
              let col = 0;
              row.forEach((cell) => {
                const text = this.parser.parseInline(cell.tokens);
                output += getTableCell(text, cell, "td", token.align[col]);
                col += cell.colspan;
              });
              output += "</tr>";
            });
            output += "</tbody>";
          }
          output += "</table>";
          return output;
        },
      },
    ],
  };
}

const getTableCell = (text, cell, type, align) => {
  if (!cell.rowspan) {
    return "";
  }
  return (
    `<${type}` +
    `${cell.colspan > 1 ? ` colspan="${cell.colspan}"` : ""}` +
    `${cell.rowspan > 1 ? ` rowspan="${cell.rowspan}"` : ""}` +
    `${align ? ` align="${align}"` : ""}>${text}</${type}>\n`
  );
};

const splitCells = (tableRow, count, prevRow = []) => {
  const cells = [...tableRow.matchAll(/(?:[^|\\]|\\.?)+(?:\|+|$)/g)].map((x) =>
    x[0].split(/\|+$/)[0].trim().replace(/\\\|/g, "|")
  );

  if (!cells[0]?.trim()) cells.shift();
  if (!cells[cells.length - 1]?.trim()) cells.pop();

  let numCols = 0;

  cells.forEach((cell, i) => {
    cells[i] = {
      rowspan: 1,
      colspan: Math.max(cell.length - cell.trim().length, 1),
      text: cell,
    };

    if (cell.slice(-1) === "^" && prevRow.length) {
      let prevCols = 0;
      for (let j = 0; j < prevRow.length; j++) {
        const prevCell = prevRow[j];
        if (prevCols === numCols && prevCell.colspan === cells[i].colspan) {
          cells[i].rowSpanTarget = prevCell.rowSpanTarget ?? prevCell;
          cells[i].rowSpanTarget.text += ` ${cells[i].text.slice(0, -1)}`;
          cells[i].rowSpanTarget.rowspan += 1;
          cells[i].rowspan = 0;
          break;
        }
        prevCols += prevCell.colspan;
        if (prevCols > numCols) break;
      }
    }
    numCols += cells[i].colspan;
  });

  if (numCols > count) {
    cells.splice(count);
  } else {
    while (numCols < count) {
      cells.push({ colspan: 1, text: "" });
      numCols += 1;
    }
  }

  return cells;
};
