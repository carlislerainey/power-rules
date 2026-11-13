-- runs before citeproc; tex2md.py marks the natbib forms that pandoc has no mode for
--   \citealt, \citealp -> prefix NOPAREN    -> span .noparen around a normal citation
--   \citeauthor        -> prefix AUTHORONLY -> span .authoronly around an in-text citation
-- cites-fix.lua trims the rendered text after citeproc

function Cite(cite)
  local prefix = pandoc.utils.stringify(cite.citations[1].prefix or {})
  for _, class in ipairs({"NOPAREN", "AUTHORONLY"}) do
    if prefix == class then
      for _, c in ipairs(cite.citations) do c.prefix = pandoc.Inlines{} end
      if class == "AUTHORONLY" then cite.citations[1].mode = "AuthorInText" end
      return pandoc.Span({cite}, {class = class:lower()})
    end
  end
end
