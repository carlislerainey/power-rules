-- The knitted Quarto document (build/knit/power-rules.html.md) as the page:
--   - each footnote becomes a margin note at its mark (a span, so it can sit inside the paragraph;
--     its paragraphs and block quote become spans with their own classes);
--   - each code callout becomes a <details> box whose summary is the callout's title;
--   - each tabset in a callout (Quarto's .panel-tabset: a header, then blocks, for each tab)
--     becomes a row of radio buttons with their labels, then the tabs' panels; CSS shows the
--     checked tab's panel, so the tabs work without the script (which syncs tabs that share a
--     group, and remembers the choice);
--   - the "Table N." and "Figure N." labels of the captions get a span, for styling;
--   - each table's caption moves out of the table, above it, so that a wide table can scroll
--     on a phone while its caption stays put.
-- The text is unchanged: only elements and classes are added.

local n = 0

local function as_spans(blocks)
  local out = pandoc.List()
  for _, b in ipairs(blocks) do
    if b.t == "Para" or b.t == "Plain" then
      out:insert(pandoc.Span(b.content, {class = "sn-p"}))
    elseif b.t == "BlockQuote" then
      out:insert(pandoc.Span(as_spans(b.content), {class = "sn-quote"}))
    else
      error("page.lua: a footnote holds a " .. b.t .. ", which a margin note cannot")
    end
  end
  return out
end

function Note(note)
  n = n + 1
  local id = "sn-" .. n
  return {
    pandoc.RawInline("html", string.format(
      '<label for="%s" class="sidenote-number">%d</label>'
      .. '<input type="checkbox" id="%s" class="margin-toggle" aria-label="Note %d">', id, n, id, n)),
    pandoc.Span(as_spans(note.content), pandoc.Attr("", {"sidenote"}, {["data-n"] = tostring(n)})),
  }
end

local function label(inlines)
  -- "Table 1." or "Figure 1." at the start of a caption
  if #inlines >= 3 and inlines[1].t == "Str" and (inlines[1].text == "Table" or inlines[1].text == "Figure")
      and inlines[2].t == "Space" and inlines[3].t == "Str" and inlines[3].text:match("^%d+%.$") then
    local rest = pandoc.List({table.unpack(inlines, 4)})
    rest:insert(1, pandoc.Span({inlines[1], inlines[2], inlines[3]}, {class = "caption-label"}))
    return rest
  end
end

local function label_caption(caption)
  local first = caption.long[1]
  if first and (first.t == "Plain" or first.t == "Para") then
    local labelled = label(first.content)
    if labelled then first.content = labelled end
  end
  return caption
end

function Table(t)
  local caption = label_caption(t.caption).long
  t.caption = {long = {}}
  -- the scrolling box can take keyboard focus (to scroll it) and is named for screen readers
  local name = pandoc.utils.stringify(caption):match("^(Table %d+)%.") or "Table"
  return {pandoc.Div(caption, {class = "table-caption"}),
          pandoc.Div({t}, pandoc.Attr("", {"table-scroll"}, {tabindex = "0", role = "region", ["aria-label"] = name}))}
end

function Figure(f)
  f.caption = label_caption(f.caption)
  return f
end

local tabsets = 0

local function tabset(div)
  tabsets = tabsets + 1
  local group = div.attributes.group or ""
  local tabs = pandoc.List()  -- {title, blocks} for each tab
  for _, b in ipairs(div.content) do
    if b.t == "Header" then
      tabs:insert({title = pandoc.utils.stringify(b), blocks = pandoc.List()})
    elseif #tabs > 0 then
      tabs[#tabs].blocks:insert(b)
    else
      error("page.lua: a tabset starts with a " .. b.t .. ", not a header")
    end
  end
  local out = pandoc.List({pandoc.RawBlock("html", string.format(
    '<div class="tabs" data-group="%s" role="tablist">', group))})
  for i, tab in ipairs(tabs) do
    local id = string.format("tabs-%d-%d", tabsets, i)
    out:insert(pandoc.RawBlock("html", string.format(
      '<input type="radio" name="tabs-%d" id="%s"%s><label for="%s" role="tab">%s</label>',
      tabsets, id, i == 1 and " checked" or "", id, tab.title)))
  end
  for _, tab in ipairs(tabs) do
    out:insert(pandoc.RawBlock("html", '<div class="tab-panel" role="tabpanel">'))
    out:extend(tab.blocks)
    out:insert(pandoc.RawBlock("html", "</div>"))
  end
  out:insert(pandoc.RawBlock("html", "</div>"))
  return out
end

function Div(div)
  if div.classes:includes("panel-tabset") then
    return tabset(div)
  end
  if div.classes:includes("callout-note") then
    local content = div.content
    local title = "Code"
    if content[1] and content[1].t == "Header" then
      title = pandoc.utils.stringify(content:remove(1))
    end
    local blocks = pandoc.List({pandoc.RawBlock("html",
      '<details class="code">\n<summary>' .. title .. '</summary>')})
    blocks:extend(content)
    blocks:insert(pandoc.RawBlock("html", "</details>"))
    return blocks
  end
end
