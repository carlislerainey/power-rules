#!/usr/bin/perl
# write copies of the paper's LaTeX sources for check/compare.py, with every inline math
# expression replaced by the word MATH, each table marked, and the repeated-author dash in
# the reference list set as text (as in the HTML): without math, the text of a PDF can be
# compared exactly
#   build/check/power-rules.tex           (the main text, without math)
#   build/check/power-rules-appendix.tex  (the appendix, without math)
# The HTML has one reference list, after the main text, for the citations of the main text and
# the appendix. So that the copies compared with it have the same, the main text's copy lists
# the appendix's citations too (\nocite), and the appendix's copy has no reference list.
use strict;
use warnings;

my $out = "build/check";
mkdir $out unless -d $out;

sub slurp { my $f = shift; open(my $fh, '<', $f) or die "cannot read $f: $!\n"; local $/; return <$fh>; }
sub spit  { my ($f, $t) = @_; open(my $fh, '>', $f) or die "cannot write $f: $!\n"; print $fh $t; close $fh; }
# math -> MATH; each table between TABLESTART and TABLEEND; each caption and each note
# under a rule between SEGSTART and SEGEND
sub nomath {
  my $t = shift;
  my $n = ($t =~ s/(?<!\\)\$[^\$]+\$/{}MATH/g);
  $t =~ s/((?:\\noindent\\makebox\[\\textwidth\]\[c\]\{%\n)?\\begin\{tabularx?\})/TABLESTART\n\n$1/g;
  $t =~ s/(\\end\{tabularx?\}\}?)/$1\n\nTABLEEND\n/g;
  $t =~ s/\\caption(\{((?:[^{}]++|(?1))*)\})/\\caption{SEGSTART $2 SEGEND}/g;
  $t =~ s/^(\{\\noindent ?\\footnotesize ?\\textit\{)(.*)\}\}$/$1SEGSTART $2 SEGEND}}/mg;
  return ($t, $n);
}

# the main text: math replaced after \begin{document} only; paths point back to ../latex-version
my $main = slurp("../latex-version/power-rules.tex");
my ($pre, $doc) = split /(?=\\begin\{document\})/, $main, 2;
my ($doc_nomath, $n) = nomath($doc);
die "no math found\n" unless $n;
$pre =~ s/\\addbibresource\{bibliography\.bib\}/\\addbibresource{..\/..\/..\/latex-version\/bibliography.bib}\n\\graphicspath{{..\/..\/..\/latex-version\/}}/ or die "no bib\n";
# the dash that replaces a repeated author in the reference list, as text rather than a rule
# and URLs without stretchable space (which a PDF reader can mistake for word spaces)
my $dash = "\\AtBeginDocument{\\renewcommand*{\\bibnamedash}{\\textemdash\\textemdash\\textemdash}"
         . "\\Urlmuskip=0mu\\biburlnumskip=0mu\\biburlucskip=0mu\\biburllcskip=0mu\\biburlbigskip=0mu\\relax}\n"
# and the dash on every page (biblatex prints the name again at the top of a page, which
# depends on where the pages break; the HTML has no pages)
         . "\\ExecuteBibliographyOptions{pagetracker=false}\n";
$doc_nomath =~ s/\\today/DATE/ or die "no date\n";  # a fixed date, so the expected differences stay the same

# the appendix: math replaced after \begin{document}; no reference list
my $app = slurp("../latex-version/power-rules-appendix.tex");
my ($app_pre, $app_doc) = split /(?=\\begin\{document\})/, $app, 2;
my ($app_nomath, $app_n) = nomath($app_doc);
die "no math found in the appendix\n" unless $app_n;
$app_pre =~ s/\\addbibresource\{bibliography\.bib\}/\\addbibresource{..\/..\/..\/latex-version\/bibliography.bib}/ or die "no bib in the appendix\n";
$app_nomath =~ s/\\printbibliography\n// or die "no reference list in the appendix\n";
spit("$out/power-rules-appendix.tex", $app_pre . $app_nomath);

# the appendix's citations, in the main text's reference list
my %keys;
while ($app_doc =~ /\\cite\w*\*?(?:\[[^\]]*\]){0,2}\{([^}]+)\}/g) { $keys{$_} = 1 for split /,\s*/, $1; }
die "no citations in the appendix\n" unless %keys;
my $nocite = "\\nocite{" . join(",", sort keys %keys) . "}\n";
$doc_nomath =~ s/(\\printbibliography)/$nocite$1/ or die "no reference list\n";
spit("$out/power-rules.tex", $pre . $dash . $doc_nomath);
print "replaced $n math expressions in the main text and $app_n in the appendix\n";
