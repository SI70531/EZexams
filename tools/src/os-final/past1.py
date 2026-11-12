# Past final exam #1 (file "v3", uploaded 2026-11-12). Each item:
# (pts, pts_given, chapter, question_html, answer_en, answer_zh, keys[(weight, regex, label)])
# pts_given False = the paper shows no points for this question; 5 is assumed so it still counts.
FIG1 = """<div class="fig" data-sfig="1"><svg aria-hidden="true" viewBox="0 0 420 300" width="380" xmlns="http://www.w3.org/2000/svg" font-family="Noto Sans TC, Liberation Sans, sans-serif" font-size="14"><defs><marker id="pe1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#1d2433"/></marker></defs>
<circle data-step="0" cx="50" cy="150" r="24" fill="#dbe8fb" stroke="#1f5fbf" stroke-width="1.6"/><text data-step="0" x="50" y="155" text-anchor="middle" font-weight="bold">P1</text>
<line data-step="1" x1="70" y1="136" x2="148" y2="78" stroke="#1d2433" stroke-width="1.6" marker-end="url(#pe1)"/>
<rect data-step="2" x="150" y="40" width="70" height="60" fill="#f2f4f8" stroke="#1d2433" stroke-width="1.5"/><text data-step="2" x="185" y="32" text-anchor="middle" font-weight="bold">R1</text><circle data-step="2" cx="185" cy="60" r="4" fill="#1d2433"/><circle data-step="2" cx="185" cy="80" r="4" fill="#1d2433"/>
<line data-step="3" x1="189" y1="58" x2="334" y2="30" stroke="#1d2433" stroke-width="1.6" marker-end="url(#pe1)"/><line data-step="3" x1="189" y1="80" x2="334" y2="112" stroke="#1d2433" stroke-width="1.6" marker-end="url(#pe1)"/>
<circle data-step="4" cx="360" cy="26" r="24" fill="#dbe8fb" stroke="#1f5fbf" stroke-width="1.6"/><text data-step="4" x="360" y="31" text-anchor="middle" font-weight="bold">P2</text>
<circle data-step="4" cx="360" cy="118" r="24" fill="#dbe8fb" stroke="#1f5fbf" stroke-width="1.6"/><text data-step="4" x="360" y="123" text-anchor="middle" font-weight="bold">P3</text>
<line data-step="5" x1="344" y1="136" x2="222" y2="208" stroke="#1d2433" stroke-width="1.6" marker-end="url(#pe1)"/>
<rect data-step="6" x="150" y="200" width="70" height="60" fill="#f2f4f8" stroke="#1d2433" stroke-width="1.5"/><text data-step="6" x="185" y="282" text-anchor="middle" font-weight="bold">R2</text><circle data-step="6" cx="185" cy="220" r="4" fill="#1d2433"/><circle data-step="6" cx="185" cy="240" r="4" fill="#1d2433"/>
<line data-step="7" x1="181" y1="220" x2="70" y2="166" stroke="#1d2433" stroke-width="1.6" marker-end="url(#pe1)"/><line data-step="7" x1="189" y1="242" x2="334" y2="268" stroke="#1d2433" stroke-width="1.6" marker-end="url(#pe1)"/>
<circle data-step="8" cx="360" cy="272" r="24" fill="#dbe8fb" stroke="#1f5fbf" stroke-width="1.6"/><text data-step="8" x="360" y="277" text-anchor="middle" font-weight="bold">P4</text>
</svg><div class="cap">Figure 1: P1 → R1 → P3 → R2 → P1 is a cycle, but R1 also holds P2 and R2 also holds P4 (two instances each).<span class="zhn">圖 1：P1 → R1 → P3 → R2 → P1 有環，但 R1 另一個 instance 給了 P2、R2 另一個給了 P4（每種資源兩個 instance）。</span></div></div>"""

BANK_TBL = """<table class="ezfull" data-fit="1"><tr><th></th><th>Allocation<br>A B C D</th><th>Max<br>A B C D</th><th>Available<br>A B C D</th></tr>
<tr><td>P0</td><td>2 0 0 1</td><td>4 2 1 2</td><td>3 3 2 1</td></tr><tr><td>P1</td><td>3 1 2 1</td><td>5 2 5 2</td><td></td></tr><tr><td>P2</td><td>2 1 0 3</td><td>2 3 1 6</td><td></td></tr><tr><td>P3</td><td>1 3 1 2</td><td>1 4 2 4</td><td></td></tr><tr><td>P4</td><td>1 4 3 2</td><td>3 6 6 5</td><td></td></tr></table>"""

PAST = [
 (5, True, "Ch5", "Please list four necessary conditions for the deadlock.",
  "Mutual exclusion, hold and wait, no preemption, circular wait.",
  "互斥、持有並等待、不可搶奪、循環等待。",
  [(1, "mutual.?exclusion|互斥", "mutual exclusion"), (1, "hold.{0,6}wait|持有.{0,3}等待", "hold and wait"), (1, "no.?preempt|non.?preempt|不可(搶|剝)", "no preemption"), (1, "circular|循環", "circular wait")]),
 (5, False, "Ch6", "Please list two types of fragmentation when we do memory allocation.",
  "Internal fragmentation and external fragmentation.",
  "內部碎片、外部碎片。",
  [(1, "internal|內部", "internal fragmentation"), (1, "external|外部", "external fragmentation")]),
 (10, True, "Ch5", "(a) What is the deadlock condition for the single-instance-per-resource environment?<br>(b) Given the system snapshot in Figure 1, will a deadlock occur? Why?" + FIG1,
  "(a) A cycle in the resource-allocation graph: with one instance per resource type, a cycle means deadlock. (b) No. Each resource type has several instances, so a cycle does not necessarily mean deadlock. P2 holds an instance of R1 and P4 an instance of R2, and neither waits for anything; when P2 releases R1 (or P4 releases R2), P1 or P3 can get it, so the cycle is broken and all processes can finish.",
  "(a) 資源配置圖有環（cycle）；每種資源只有一個 instance 時，有環就是死結。(b) 不會。這是多 instance 的系統，有環不一定死結。P2 拿著 R1 的一個 instance、P4 拿著 R2 的一個 instance，它們不等任何資源；P2 釋放 R1（或 P4 釋放 R2）後，P1 或 P3 就能拿到，環被打破，大家都能完成。",
  [(2.5, "cycle|環", "(a) a cycle in the graph"), (2.5, "\\bno\\b|不會|沒有.{0,4}死結|no deadlock", "(b) no deadlock"), (2.5, "multiple|several|instance|多個|兩個", "multiple instances, so a cycle is not enough"), (2.5, "p2|p4|release|釋放", "P2 / P4 release, then P1 / P3 continue")]),
 (5, True, "Ch4", "Please list four multithreading models for mapping user threads and kernel threads.",
  "Many-to-one, one-to-one, many-to-many, and two-level (a many-to-many model that also allows one-to-one binding).",
  "多對一、一對一、多對多、雙層（多對多加上可綁定一對一的混合）。",
  [(1.25, "many.?to.?one|m\\s*:\\s*1|多對一", "many-to-one"), (1.25, "one.?to.?one|1\\s*:\\s*1|1.?to.?1|一對一", "one-to-one"), (1.25, "many.?to.?many|m\\s*:\\s*m|多對多", "many-to-many"), (1.25, "two.?level|兩層|雙層|二層", "two-level")]),
 (5, False, "Ch7", "Explain Belady's anomaly.",
  "For some page-replacement algorithms (e.g. FIFO), the page-fault rate may increase as the number of allocated frames increases. Example: the string 1,2,3,4,1,2,5,1,2,3,4,5 gives 9 faults with 3 frames but 10 with 4 frames under FIFO. Stack algorithms such as LRU and OPT do not have it.",
  "某些替換演算法（例如 FIFO），frame 變多時 page fault 反而變多。例：1,2,3,4,1,2,5,1,2,3,4,5 用 FIFO，3 個 frame 9 次、4 個 frame 10 次。LRU、OPT 這類 stack algorithm 不會。（參考答案把原因寫成「降低 CPU 使用率」並不正確，重點只在 frame 多、fault 反而多。）",
  [(3, "more frames|frame.{0,20}(more|增加|變多|越多)|(越多|增加).{0,10}frame", "more frames → more page faults"), (2, "fifo|先進先出", "e.g. FIFO")]),
 (5, False, "Ch7", "What is thrashing? How can it be prevented?",
  "Thrashing: a process does not have enough frames, so it page-faults constantly and spends more time paging than executing; CPU utilization drops, the OS adds more processes to raise utilization, and it gets worse. Prevention: the working-set model (give each process enough frames for its working set; if the total demand D > m, suspend a process), page-fault frequency (add frames when the fault rate is too high, take them away when it is too low), and limiting the degree of multiprogramming / using local replacement.",
  "Thrashing：process 的 frame 不夠，一直 page fault，換頁時間比執行還多；CPU 使用率下降，OS 又加 process 進來，越來越糟。預防：working-set model（給足工作集的 frame，總需求 D > m 就暫停一個 process）、page-fault frequency（fault 率高就加 frame、低就減）、限制多元程式程度或用區域替換。",
  [(2, "page fault|swap|換頁|paging", "busy paging / high fault rate"), (1, "cpu|utiliz|使用率", "CPU utilization drops"), (1, "working.?set|工作集", "working-set model"), (1, "frequency|pff|頻率", "page-fault frequency")]),
 (5, False, "Ch7", "What is TLB reach? How can TLB reach be increased?",
  "TLB reach is the amount of memory accessible from the TLB: TLB reach = (TLB size) × (page size). Increase it by increasing the page size or by providing multiple page sizes.",
  "TLB reach：靠 TLB 就能存取到的記憶體量 = TLB 筆數 × 頁大小。增加方法：加大頁大小，或提供多種頁大小。",
  [(2, "size\\s*[×x*]\\s*page|tlb size|筆數|×", "TLB size × page size"), (1.5, "page size|頁大小|larger page|加大", "increase the page size"), (1.5, "multiple|多種", "multiple page sizes")]),
 (5, False, "Ch7", "Consider the page reference string 7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1. Assuming demand paging with three frames, how many page faults would occur for: (1) FIFO replacement (2) Optimal replacement (3) LRU replacement (4) Counting replacement with least frequently used (LFU)?",
  "(1) FIFO: 15. (2) Optimal: 9. (3) LRU: 12. (4) LFU: 13 (ties between pages with the same count broken by FIFO order, i.e. the page loaded earliest is replaced).",
  "(1) FIFO：15 次。(2) Optimal：9 次。(3) LRU：12 次。(4) LFU：13 次（次數相同時，換掉最早載入的那頁）。原卷沒有附答案，這裡是算出來的。",
  [(1.25, "fifo[^\\n]{0,25}15|15[^\\n]{0,15}fifo|\\(1\\)[^\\n]{0,15}15", "FIFO = 15"), (1.25, "(opt|optimal|最佳)[^\\n]{0,25}(?<!\\d)9(?!\\d)|\\(2\\)[^\\n]{0,15}(?<!\\d)9(?!\\d)", "OPT = 9"), (1.25, "lru[^\\n]{0,25}12|\\(3\\)[^\\n]{0,15}12", "LRU = 12"), (1.25, "lfu[^\\n]{0,25}13|\\(4\\)[^\\n]{0,15}13", "LFU = 13")]),
 (25, True, "Ch5", "Consider the following snapshot of a system:" + BANK_TBL + "Answer using the banker's algorithm: (1) List the total number of instances of each resource (A, B, C, D). (2) What is the content of the matrix Need? (3) If a request from P1 arrives for (1, 1, 0, 0), can it be granted immediately? Why? (4) If a request from P4 arrives for (0, 0, 2, 0), can it be granted immediately? Why?",
  "(1) Total = Available + Σ Allocation: A = 3+2+3+2+1+1 = 12, B = 3+0+1+1+3+4 = 12, C = 2+0+2+0+1+3 = 8, D = 1+1+1+3+2+2 = 10 → (12, 12, 8, 10). (2) Need = Max − Allocation: P0 (2,2,1,1), P1 (2,1,3,1), P2 (0,2,1,3), P3 (0,1,1,2), P4 (2,2,3,3). (3) Yes. (1,1,0,0) ≤ Need P1 (2,1,3,1) and ≤ Available (3,3,2,1). Pretend to grant: Available = (2,2,2,1), Allocation P1 = (4,2,2,1), Need P1 = (1,0,3,1). Safety: P0 (2,2,1,1) ≤ (2,2,2,1) → Work (4,2,2,2); P3 (0,1,1,2) → (5,5,3,4); P4 (2,2,3,3) → (6,9,6,6); P1 (1,0,3,1) → (10,11,8,7); P2 (0,2,1,3) → (12,12,8,10). Safe sequence <P0, P3, P4, P1, P2>, so it can be granted. (4) No. (0,0,2,0) ≤ Need P4 (2,2,3,3) and ≤ Available (3,3,2,1), but after pretending to grant, Available = (3,3,0,1) and Need P4 = (2,2,1,3). Every process needs at least one C or more D than available (P0 needs C=1, P1 C=3, P2 C=1 and D=3, P3 C=1, P4 C=1), so no process can finish: the state is unsafe and P4 must wait.",
  "(1) 總數 = Available + Allocation 加總 = (12, 12, 8, 10)。(2) Need = Max − Allocation：P0 (2,2,1,1)、P1 (2,1,3,1)、P2 (0,2,1,3)、P3 (0,1,1,2)、P4 (2,2,3,3)。(3) 可以。(1,1,0,0) ≤ Need 且 ≤ Available；假裝給了之後 Available = (2,2,2,1)，可找到安全序列 <P0, P3, P4, P1, P2>，所以立刻給。(4) 不行。雖然 (0,0,2,0) ≤ Need 且 ≤ Available，但給了之後 Available = (3,3,0,1)，每個 process 都還要至少一個 C，沒人能完成 → unsafe，P4 要等。（原卷答案只寫到假裝分配，沒有做安全檢查；第 (4) 小題也誤寫成 P1。）",
  [(4, "12[^\\n]{0,6}12[^\\n]{0,6}8[^\\n]{0,6}10", "(1) totals (12, 12, 8, 10)"), (1.25, "2\\D{0,3}2\\D{0,3}1\\D{0,3}1", "Need P0 (2,2,1,1)"), (1.25, "2\\D{0,3}1\\D{0,3}3\\D{0,3}1", "Need P1 (2,1,3,1)"), (1.25, "0\\D{0,3}2\\D{0,3}1\\D{0,3}3", "Need P2 (0,2,1,3)"), (1.25, "0\\D{0,3}1\\D{0,3}1\\D{0,3}2", "Need P3 (0,1,1,2)"), (1, "2\\D{0,3}2\\D{0,3}3\\D{0,3}3", "Need P4 (2,2,3,3)"), (4, "p0[^\\n]{0,12}p3[^\\n]{0,12}p4|safe sequence|安全序列", "(3) a safe sequence"), (3, "\\(3\\)[^\\n]{0,40}(yes|可以|grant)|yes|可以", "(3) yes"), (3.5, "unsafe|不安全|不行|\\bno\\b|wait|等", "(4) no, unsafe"), (3.5, "3\\D{0,3}3\\D{0,3}0\\D{0,3}1", "(4) Available becomes (3,3,0,1)")]),
 (15, True, "Ch6", "A paging system uses a TLB. (a) Given a hit ratio α = 80%, an associative lookup time ε = 10 ns for the TLB search and a memory access time of 200 ns, what is the effective access time (EAT)? (b) If we want the EAT to be 230 ns, what is the minimum hit ratio α? Why?",
  "(a) EAT = α(m + ε) + (1 − α)(2m + ε) = 0.8 × (200 + 10) + 0.2 × (400 + 10) = 168 + 82 = 250 ns. (b) 210α + 410(1 − α) ≤ 230 → 410 − 200α ≤ 230 → α ≥ 0.9, so the hit ratio must be at least 90%: every miss costs an extra 200 ns memory access for the page table, so more hits are needed to bring the average down.",
  "(a) EAT = 0.8 × 210 + 0.2 × 410 = 250 ns。(b) 210α + 410(1 − α) ≤ 230 → α ≥ 0.9，命中率至少 90%：每次 miss 要多一次 200 ns 去讀 page table，所以要更多命中才能把平均拉低。（原卷 (b) 把命中率寫成 ε，其實是 α。）",
  [(2, "210|200\\s*\\+\\s*10", "hit: 210 ns"), (2, "410|400\\s*\\+\\s*10|2\\s*×?\\s*200", "miss: 410 ns"), (5, "(?<!\\d)250(?!\\d)", "(a) 250 ns"), (6, "0?\\.9(?!\\d)|90\\s*%", "(b) α ≥ 0.9")]),
 (10, True, "Ch4", "An application has 60% parallel and 40% serial components. Based on Amdahl's law, what is the speedup if we move from 1 processing core to 4 processing cores? What is the speedup with infinitely many processing cores?",
  "Speedup ≤ 1 / (S + (1 − S)/N) with S = 0.4. N = 4: 1 / (0.4 + 0.6/4) = 1 / 0.55 ≈ 1.82. N → ∞: speedup → 1/S = 1/0.4 = 2.5.",
  "speedup ≤ 1 / (S + (1 − S)/N)，S = 0.4。N = 4：1 / (0.4 + 0.15) = 1 / 0.55 ≈ 1.82。N → ∞：趨近 1/S = 2.5。",
  [(2, "0?\\.55|0\\.4\\s*\\+\\s*0\\.15", "1 / (0.4 + 0.15)"), (4, "1\\.8(1|2|18)?|20\\s*/\\s*11|400\\s*/\\s*220", "N = 4: ≈ 1.82"), (4, "2\\.5(?!\\d)|1\\s*/\\s*0\\.4|5\\s*/\\s*2", "N → ∞: 2.5")]),
 (10, True, "Ch6", "In a paging system the TLB hit ratio is 90%; it takes 10 ns to search the TLB and 100 ns to access memory. (a) What is the effective memory access time with a single-level page table? (b) What is it with a two-level page table?",
  "(a) 0.9 × (10 + 100) + 0.1 × (10 + 100 + 100) = 99 + 21 = 120 ns. (b) A miss now needs two page-table accesses plus the data access: 0.9 × 110 + 0.1 × (10 + 300) = 99 + 31 = 130 ns.",
  "(a) 0.9 × 110 + 0.1 × 210 = 120 ns。(b) 兩層 page table，miss 時要讀兩次 page table 再讀資料：0.9 × 110 + 0.1 × 310 = 130 ns。（原卷題目漏了「10 ns」。）",
  [(5, "(?<!\\d)120(?!\\d)", "(a) 120 ns"), (5, "(?<!\\d)130(?!\\d)", "(b) 130 ns")]),
 (10, True, "Ch6", "Consider a byte-oriented logical address space of 8 pages of 1,024 bytes each, mapped onto a physical memory of 32 frames. (a) How many bits are there in the logical address? (b) How many bits are there in the physical address?",
  "(a) 8 = 2³ pages → 3 bits of page number; 1,024 = 2¹⁰ bytes → 10 bits of offset; logical address = 3 + 10 = 13 bits. (b) 32 = 2⁵ frames → 5 bits of frame number + 10 bits of offset = 15 bits.",
  "(a) 8 = 2³ 頁 → 頁號 3 位；1,024 = 2¹⁰ → offset 10 位；邏輯位址 = 13 位。(b) 32 = 2⁵ 個 frame → 5 位 + offset 10 位 = 15 位。",
  [(5, "(?<!\\d)13(?!\\d)", "(a) 13 bits"), (5, "(?<!\\d)15(?!\\d)", "(b) 15 bits")]),
]

TOPICS = ["Four necessary conditions for deadlock", "Two types of fragmentation", "Deadlock condition with single instances; does Figure 1 deadlock?",
          "Four multithreading models", "Belady's anomaly", "Thrashing and how to prevent it", "TLB reach and how to increase it",
          "Page faults: FIFO, OPT, LRU, LFU with 3 frames", "Banker's algorithm: totals, Need, two requests", "TLB effective access time; minimum hit ratio",
          "Amdahl's law: 4 cores and infinite cores", "EAT with single- and two-level page tables", "Logical and physical address bits"]
