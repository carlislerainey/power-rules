-- runs after citeproc; makes the rendered citations match the natbib forms in the LaTeX source
--   \citeyear (suppress-author)  -> year and page only, no parentheses: "1988, 25"
--   .noparen (\citealt, \citealp) -> no parentheses: "Bloom 1995"
--   .authoronly (\citeauthor)     -> the author only: "Cohen"

local function strip_parens(inlines)
  local first = inlines[1]
  if first and first.t == "Str" and first.text:sub(1, 1) == "(" then
    first.text = first.text:sub(2)
    if first.text == "" then inlines:remove(1) end
  end
  local last = inlines[#inlines]
  if last and last.t == "Str" and last.text:sub(-1) == ")" then
    last.text = last.text:sub(1, -2)
    if last.text == "" then inlines:remove(#inlines) end
  end
  return inlines
end

-- the content of a cite, which citeproc may have wrapped in a link
local function walk_cite_text(cite, f)
  cite.content = f(cite.content)
  return cite
end

function Cite(cite)
  if cite.citations[1].mode == "SuppressAuthor" then
    return walk_cite_text(cite, function(inl)
      inl = strip_parens(inl)
      -- \citeyear prints the year of the edition only: drop an original date like "[1923]"
      -- (inside the link to the reference when citations are linked)
      local text = (inl[1] and inl[1].t == "Link") and inl[1].content or inl
      if text[1] and text[1].t == "Str" and text[1].text:match("^%[%d+%]$") and text[2] and text[2].t == "Space" then
        text:remove(1); text:remove(1)
      end
      return inl
    end)
  end
end

function Span(span)
  local cite = span.content[1]
  if not (cite and cite.t == "Cite") then return nil end
  if span.classes:includes("noparen") then
    walk_cite_text(cite, strip_parens)
    return cite
  elseif span.classes:includes("authoronly") then
    walk_cite_text(cite, function(inl)
      local out = pandoc.Inlines{}
      for _, el in ipairs(inl) do
        if el.t == "Str" and el.text:sub(1, 1) == "(" then break end
        out:insert(el)
      end
      while #out > 0 and out[#out].t == "Space" do out:remove(#out) end
      return out
    end)
    return cite
  end
end

-- \cite of an entry with a shortauthor ("ANES"): biblatex prints the short form in the text;
-- citeproc prints the full author, so replace it (pairs from tex2md.py, metadata shortauthors)
local short = {}

local function replace_author(inlines, full, abbrev)
  local out = pandoc.Inlines{}
  local i = 1
  while i <= #inlines do
    local el = inlines[i]
    if el.t == "Link" or el.t == "Span" then
      el.content = replace_author(el.content, full, abbrev)
      out:insert(el)
      i = i + 1
    else
      -- does the text starting here spell the full author?
      local text, j = "", i
      while j <= #inlines and (inlines[j].t == "Str" or inlines[j].t == "Space") and #text < #full do
        text = text .. (inlines[j].t == "Str" and inlines[j].text or " ")
        j = j + 1
      end
      if text == full then
        out:insert(pandoc.Str(abbrev))
        i = j
      else
        out:insert(el)
        i = i + 1
      end
    end
  end
  return out
end

function Pandoc(doc)
  for key, pair in pairs(doc.meta.shortauthors or {}) do
    short[key] = {pandoc.utils.stringify(pair.full), pandoc.utils.stringify(pair.short)}
  end
  return doc:walk({
    Cite = function(cite)
      for _, c in ipairs(cite.citations) do
        local pair = short[c.id]
        if pair and c.mode ~= "SuppressAuthor" then
          cite.content = replace_author(cite.content, pair[1], pair[2])
        end
      end
      return cite
    end
  })
end
