-- moves each rule's anchor (\hypertarget) onto its box, so links to a rule land on the box
function Div(div)
  if div.classes:includes("rulebox") then
    local first = div.content[1]
    if first and first.t == "Div" and first.identifier ~= "" and #first.content == 0 then
      div.identifier = first.identifier
      div.content:remove(1)
    end
    return div
  end
end
