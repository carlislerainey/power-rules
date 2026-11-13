-- The paper's Markdown (../html-version/build/md/body.md) as plain Markdown for the version
-- that AI agents read (power-rules.md). Only the markup changes, never the words:
--   - links within the paper become their text ("Rule 3", "Table 1", "Bloom 1995"); links
--     to the web stay;
--   - each rule box, with the note under it, becomes a block quote;
--   - each table's caption moves above the table, and a cell of several lines becomes one
--     line (<br> between the lines; an arrow between the rules of a rule sequence), so that
--     every table is a pipe table; a cell left empty under the cell it shares (the goals of
--     Table 2) repeats that cell, so that each row can be read alone;
--   - the figure becomes its caption and a description of the image in words;
--   - each footnote is printed below the block that cites it, [^12] in the main text and
--     [^A3] in the appendices, where the PDF's numbers start again at 1;
--   - the blanks ("has ___% power") become underscores, and a minus sign set as math a hyphen;
--   - headings move down one level, under the title, and lose their attributes;
--   - the reference list moves to the end, as a bulleted list.
-- build.py runs this filter and check.py compares the result with the paper.

-- Figure 1 in words: the alternative text written for the journal (the accessibility form
-- submitted to Political Analysis, 2026-11-05)
local FIGURE_IN_WORDS = {
  ["fig:intuition"] = "A normal density curve titled, The Geometry of 80% Power, centered at a true treatment effect of 5 with standard error 2. A vertical line 1.64 standard errors above zero divides it. 20% of the area lies to the left, the shaded 80% to the right.",
}

local NBSP = "\u{a0}"

local function is_arrow(block)
  return #block.content == 1 and block.content[1].t == "Math" and block.content[1].text == "\\downarrow"
end

-- the paragraphs of a table cell on one line
local function one_line(blocks)
  if #blocks <= 1 then return blocks end
  local inlines = pandoc.Inlines{}
  local glue = nil
  for _, b in ipairs(blocks) do
    if b.t ~= "Para" and b.t ~= "Plain" then error("agents.lua: a table cell holds a " .. b.t) end
    if is_arrow(b) then
      glue = pandoc.Str(" → ")
    else
      if #inlines > 0 then inlines:insert(glue or pandoc.RawInline("html", "<br>")) end
      inlines:extend(b.content)
      glue = nil
    end
  end
  return pandoc.Blocks{pandoc.Plain(inlines)}
end

local markup = {
  Link = function(link)
    if link.target:sub(1, 1) == "#" then return link.content end
  end,

  Span = function(span) return span.content end,

  Underline = function(u)
    if pandoc.utils.stringify(u.content):gsub(NBSP, " "):match("^%s*$") then
      return pandoc.RawInline("markdown", "_____")
    end
    error("agents.lua: underlined text that is not a blank")
  end,

  -- a minus sign set as math ($-$90%) joins the number after it: -90%
  Inlines = function(inlines)
    local out = pandoc.Inlines{}
    for _, x in ipairs(inlines) do
      local last = out[#out]
      if x.t == "RawInline" and x.text == "<!-- -->" then
        -- pandoc's separator between the math and the number: dropped
      elseif last and last.t == "Math" and last.text == "-" then
        out[#out] = pandoc.Str("-" .. (x.t == "Str" and x.text or ""))
        if x.t ~= "Str" then out:insert(x) end
      else
        out:insert(x)
      end
    end
    return out
  end,

  Table = function(tbl)
    local caption = tbl.caption.long
    tbl.caption = {long = pandoc.Blocks{}}
    tbl.colspecs = tbl.colspecs:map(function(spec) return {spec[1], nil} end)
    local function rows(list, fill)
      local above = nil
      for _, row in ipairs(list) do
        for _, cell in ipairs(row.cells) do cell.contents = one_line(cell.contents) end
        local first = row.cells[1]
        if fill and above and #first.contents == 0 then
          first.contents = above:clone()
        end
        above = first.contents
      end
    end
    rows(tbl.head.rows, false)
    for _, body in ipairs(tbl.bodies) do rows(body.head, false); rows(body.body, true) end
    rows(tbl.foot.rows, false)
    local out = pandoc.Blocks{}
    for _, b in ipairs(caption) do out:insert(pandoc.Para(b.content)) end
    out:insert(tbl)
    return out
  end,

  Figure = function(fig)
    local words = FIGURE_IN_WORDS[fig.identifier]
    if not words then error("agents.lua: no description in words for the figure " .. fig.identifier) end
    local out = pandoc.Blocks{}
    for _, b in ipairs(fig.caption.long) do out:insert(pandoc.Para(b.content)) end
    out:insert(pandoc.Para{pandoc.Emph{pandoc.Str("Figure in words: " .. words)}})
    return out
  end,

  Blocks = function(blocks)
    local out = pandoc.Blocks{}
    local i = 1
    while i <= #blocks do
      local b = blocks[i]
      if b.t ~= "Div" then
        out:insert(b)
      elseif b.classes:includes("rulebox") then
        local content = pandoc.Blocks(b.content)
        local after = blocks[i + 1]
        if after and after.t == "Div" and after.classes:includes("rulenote") then
          content:extend(after.content)
          i = i + 1
        end
        out:insert(pandoc.BlockQuote(content))
      elseif b.classes:includes("rulenote") then
        error("agents.lua: a note that does not follow a rule box")
      elseif b.identifier == "refs" then
        local items = pandoc.List()
        for _, entry in ipairs(b.content) do items:insert(pandoc.Blocks{pandoc.Plain(entry.content)}) end
        out:insert(pandoc.Div(pandoc.Blocks{pandoc.BulletList(items)}, pandoc.Attr("refs")))
      else
        out:extend(b.content)  -- the wrapper of a table or of a reference
      end
      i = i + 1
    end
    return out
  end,
}

local function structure(doc)
  local out, refs = pandoc.Blocks{}, nil
  local prefix, n = "", 0
  for _, b in ipairs(doc.blocks) do
    if b.t == "Div" and b.identifier == "refs" then
      refs = b.content
    else
      if b.t == "Header" then
        if prefix == "" and b.identifier:match("^app:") then prefix, n = "A", 0 end
        b.level = (b.level == 4) and 3 or b.level + 1  -- the run-in headings after the Conclusion
        b.attr = pandoc.Attr()
      end
      local notes = pandoc.List()
      b = pandoc.walk_block(b, {
        Note = function(note)
          n = n + 1
          local label = "[^" .. prefix .. n .. "]"
          local text = pandoc.write(pandoc.Pandoc(note.content), "gfm", pandoc.WriterOptions{wrap_text = "none"})
          text = text:gsub("%s+$", ""):gsub("\n", "\n    ")
          notes:insert(label .. ": " .. text)
          return pandoc.RawInline("markdown", label)
        end,
      })
      out:insert(b)
      if #notes > 0 then out:insert(pandoc.RawBlock("markdown", table.concat(notes, "\n\n"))) end
    end
  end
  if not refs then error("agents.lua: no reference list") end
  out:insert(pandoc.Header(2, "References"))
  out:extend(refs)
  return pandoc.Pandoc(out, doc.meta)
end

return {markup, {Pandoc = structure}}
