const LABEL_TEXT = { positive: "긍정", neutral: "중립", negative: "부정" };

function sanitizeFilenamePart(text) {
  return (text ?? "상품").replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
}

export async function exportToExcel({ productName, reviews, reviewLabels, keywords }) {
  const labelByIndex = new Map((reviewLabels ?? []).map((r) => [r.index, r]));
  const keywordLabelById = new Map((keywords ?? []).map((k) => [k.id, k.label]));

  const rows = (reviews ?? []).map((review) => {
    const rl = labelByIndex.get(review.index);
    const keywordLabels = (rl?.keywords ?? []).map((id) => keywordLabelById.get(id) ?? id);
    return {
      번호: review.index,
      리뷰원문: review.text,
      별점: review.rating ?? "",
      작성일: review.date ?? "",
      옵션: review.option ?? "",
      감성라벨: LABEL_TEXT[rl?.label] ?? "",
      키워드태그: keywordLabels.join(", "),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 60 },
    { wch: 6 },
    { wch: 12 },
    { wch: 16 },
    { wch: 8 },
    { wch: 24 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "리뷰 분석");

  const arrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  const blob = new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);

  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `쇼핑리뷰분석_${sanitizeFilenamePart(productName)}_${dateStamp}.xlsx`;

  await chrome.downloads.download({ url, filename, saveAs: false });
  // revoke 약간 지연 — download가 URL을 읽어들일 시간을 확보
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
