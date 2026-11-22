/* ===== Bộ soạn lời bài hát tiếng Việt (offline) ===== */
(function (G) {
  'use strict';

  // ---------- Quan hệ & cách xưng hô ----------
  // T = người hát (người tặng), B = người nhận
  const RELATIONS = [
    { id: 'chong', label: 'Chồng', bank: 'love', pr: () => ['em', 'anh'] },
    { id: 'vo', label: 'Vợ', bank: 'love', pr: () => ['anh', 'em'] },
    { id: 'bandoi', label: 'Bạn đời', bank: 'love', pr: s => s === 'nu' ? ['em', 'anh'] : ['anh', 'em'] },
    { id: 'bangai', label: 'Bạn gái', bank: 'love', pr: () => ['anh', 'em'] },
    { id: 'bantrai', label: 'Bạn trai', bank: 'love', pr: () => ['em', 'anh'] },
    { id: 'contrai', label: 'Con trai', bank: 'child', pr: s => s === 'nu' ? ['mẹ', 'con'] : ['ba', 'con'] },
    { id: 'congai', label: 'Con gái', bank: 'child', pr: s => s === 'nu' ? ['mẹ', 'con'] : ['ba', 'con'] },
    { id: 'honphu', label: 'Hôn phu / hôn thê', bank: 'love', pr: s => s === 'nu' ? ['em', 'anh'] : ['anh', 'em'] },
    { id: 'ba', label: 'Bố / Ba', bank: 'parent', pr: () => ['con', 'ba'] },
    { id: 'me', label: 'Mẹ / Má', bank: 'parent', pr: () => ['con', 'mẹ'] },
    { id: 'ongba', label: 'Ông / Bà', bank: 'grand', pr: () => ['cháu', 'ông bà'] },
    { id: 'chautrai', label: 'Cháu trai', bank: 'child', pr: s => s === 'nu' ? ['bà', 'cháu'] : ['ông', 'cháu'] },
    { id: 'chaugai', label: 'Cháu gái', bank: 'child', pr: s => s === 'nu' ? ['bà', 'cháu'] : ['ông', 'cháu'] },
    { id: 'anhchiem', label: 'Anh / Chị / Em', bank: 'general', pr: () => ['mình', 'bạn'] },
    { id: 'banthan', label: 'Bạn thân', bank: 'friend', pr: () => ['tớ', 'cậu'] },
    { id: 'thayco', label: 'Thầy / Cô', bank: 'teacher', pr: () => ['em', 'thầy cô'] },
    { id: 'chinhminh', label: 'Cho chính mình', bank: 'general', pr: () => ['tôi', 'chính mình'] },
    { id: 'khac', label: 'Người khác', bank: 'general', pr: () => ['tôi', 'bạn'] }
  ];

  // Cặp câu (2 dòng hiệp vần) theo quan hệ
  const REL_BANK = {
    love: [
      ['Ngày {B} đến bên đời {T} dịu dàng', 'Như nắng sớm rơi trên phố vàng'],
      ['{T} chẳng cần chi giữa trời mênh mông', 'Chỉ cần {B} cười là ấm cả lòng'],
      ['Bao nhiêu mùa mưa ta đã đi qua', 'Tay vẫn trong tay chẳng cách xa'],
      ['{T} muốn cùng {B} đi hết con đường', 'Qua bao bão giông vẫn mãi còn thương'],
      ['Có những đêm dài nhớ {B} không thôi', 'Ánh mắt nụ cười cứ mãi bồi hồi'],
      ['Giữa phố đông người {T} chỉ thấy {B} thôi', 'Như ánh sao đêm sáng giữa bầu trời']
    ],
    parent: [
      ['Bao năm {B} tảo tần sớm khuya', 'Lo cho {T} từng bữa sớm trưa'],
      ['Tóc {B} giờ đã điểm bạc màu sương', 'Mà vẫn dành cho {T} trọn yêu thương'],
      ['Lời ru năm ấy vẫn còn nguyên', 'Theo {T} đi khắp mọi miền bình yên'],
      ['Dù {T} đi xa đến chân trời nào', 'Vòng tay {B} vẫn là nơi ngọt ngào'],
      ['Đôi bàn tay {B} chai sạn tháng ngày', 'Vẫn ấm êm như những ngày thơ ngây']
    ],
    child: [
      ['Ngày {B} cất tiếng khóc chào đời', '{T} thấy như có cả bầu trời'],
      ['{B} ơi bước nhỏ rồi sẽ đi xa', 'Nhớ luôn có {T} ở phía sau nhà'],
      ['Mong {B} lớn lên thật vững vàng', 'Bước qua giông bão vẫn hiên ngang'],
      ['Nụ cười {B} là nắng mỗi sớm mai', 'Xua tan bao mệt nhọc đường dài']
    ],
    grand: [
      ['Bên hiên nhà nghe {B} kể chuyện xưa', 'Kẽo kẹt võng đưa những buổi trưa'],
      ['Mái tóc {B} giờ đã trắng như mây', 'Mong {B} vui khỏe mãi với tháng ngày'],
      ['Lời ru năm ấy vẫn còn nguyên', 'Theo {T} đi khắp mọi miền bình yên'],
      ['Dù {T} đi xa đến chân trời nào', 'Vòng tay {B} vẫn là nơi ngọt ngào']
    ],
    friend: [
      ['Nhớ những ngày ta cười vang sân trường', 'Chung chiếc xe đạp rong ruổi phố phường'],
      ['Lúc {T} buồn chẳng biết nói cùng ai', '{B} luôn ở đó cho mượn bờ vai'],
      ['Bao năm tháng trôi ta vẫn bên nhau', 'Tình bạn này chẳng phai nhạt sắc màu'],
      ['Dù mai này mỗi đứa một phương', 'Vẫn nhớ về nhau với bao yêu thương']
    ],
    teacher: [
      ['Lời {B} giảng năm nào vẫn vang trong tim', 'Dẫn lối {T} qua những lúc đắm chìm'],
      ['Như người lái đò lặng lẽ sang sông', 'Đưa bao thế hệ cập bến ước mong'],
      ['Bao mùa phượng đỏ nở rồi lại tàn', 'Ơn {B} như biển mênh mang muôn vàn'],
      ['Phấn trắng bảng đen những ngày thơ ngây', '{B} dạy {T} nên người từng phút từng giây']
    ],
    general: [
      ['Gặp nhau giữa dòng đời vội vã', 'Bỗng thấy lòng mình bình yên lạ'],
      ['Cảm ơn {B} vì đã đến nơi này', 'Cho {T} những ngày tháng thật đong đầy'],
      ['Có những người đi qua rồi lại quên', 'Còn {B} mãi trong {T} thật vững bền'],
      ['Mong {B} luôn vui dù nắng hay mưa', 'Bình an hạnh phúc như những ngày xưa']
    ]
  };

  // ---------- Dịp tặng ----------
  const OCCASIONS = [
    {
      id: 'sinhnhat', label: 'Sinh nhật', titles: ['Mừng Sinh Nhật {N}', 'Tuổi Mới Của {N}', 'Nến Hồng Cho {N}'],
      chorus: [
        ['Chúc mừng sinh nhật {N} ơi', 'Nến lung linh sáng cả bầu trời', 'Tuổi mới thêm bao niềm vui mới', 'Hạnh phúc ngập tràn suốt cả cuộc đời'],
        ['Hôm nay là ngày của {N}', 'Thổi nến lên nhé ước điều thật xinh', 'Mong cho tuổi mới luôn bình yên', 'Nụ cười trên môi mãi lung linh']
      ],
      pairs: [
        ['Thêm một tuổi mới thêm một mùa hoa', 'Bao điều ước mơ sẽ không còn xa'],
        ['Ánh nến lung linh bánh kem ngọt ngào', 'Lời chúc hôm nay {T} gửi trọn trao'],
        ['Mong {B} mạnh khỏe mong {B} bình an', 'Tuổi mới rạng ngời như nắng chói chang']
      ],
      bridge: [['Dù mai này có đi bao xa', 'Ngày hôm nay mãi là món quà']]
    },
    {
      id: 'kyniem', label: 'Kỷ niệm ngày yêu', titles: ['Ngày Ấy Mình Chung Lối', 'Gửi {N} Ngày Kỷ Niệm', 'Mãi Như Ngày Đầu'],
      chorus: [
        ['{N} ơi ngày ấy mình chung lối', 'Một lời hẹn ước đến cuối cuộc đời', 'Bao nhiêu năm tháng đã trôi', 'Tình mình vẫn thắm như ngày đầu thôi'],
        ['Cảm ơn {N} đã ở bên {T}', 'Đi qua nắng mưa chẳng chút phai nhòa', 'Kỷ niệm hôm nay ta cùng trao', 'Một tình yêu mãi ngọt ngào']
      ],
      pairs: [
        ['Nhớ lần đầu tiên ta nắm tay nhau', 'Con phố hôm ấy ngập tràn sắc màu'],
        ['Mỗi năm qua đi tình lại thêm sâu', 'Như dòng sông dài chảy mãi về sau'],
        ['Có những giận hờn rồi cũng qua mau', 'Chỉ còn yêu thương ta trao cho nhau']
      ],
      bridge: [['Dẫu cho thời gian có phai mờ', 'Tình ta vẫn mãi như bài thơ']]
    },
    {
      id: 'totinh', label: 'Tỏ tình', titles: ['{T} Thương {B} Rồi', 'Gửi {N} Lời Thương', 'Nói Thương {N}'],
      chorus: [
        ['{N} ơi {T} thương {B} rồi', 'Thương từ ánh mắt thương từ nụ cười', 'Cho {T} được nắm tay {B} nhé', 'Cùng đi hết những tháng năm cuộc đời']
      ],
      pairs: [
        ['Bao lần muốn nói mà chẳng thành lời', 'Cứ ngập ngừng mãi giữa chốn đông người'],
        ['Trái tim {T} rung lên mỗi khi {B} cười', 'Như cánh hoa xuân khẽ nở giữa trời'],
        ['Từng tin nhắn nhỏ {T} đọc mãi không thôi', 'Mong ngày mai tới để gặp {B} thôi']
      ],
      bridge: [['Nếu {B} cũng thương xin hãy gật đầu', 'Để {T} được yêu {B} đến mai sau']]
    },
    {
      id: 'camon', label: 'Cảm ơn / Tri ân', titles: ['Cảm Ơn {N}', 'Lời Cảm Ơn Gửi {N}', 'Ơn Sâu'],
      chorus: [
        ['Cảm ơn {N} thật nhiều', 'Vì những tháng ngày bao la thương yêu', 'Dù mai này có đi đâu', 'Lòng {T} vẫn nhớ mãi ơn sâu']
      ],
      pairs: [
        ['Những điều {B} làm lặng lẽ chẳng ai hay', 'Nhưng {T} vẫn khắc ghi từng phút giây'],
        ['Như ngọn đèn khuya soi sáng lối về', 'Cho {T} vững bước qua bao bộn bề'],
        ['Nếu không có {B} những ngày gian nan', 'Chắc {T} chẳng thể vượt qua muôn vàn']
      ],
      bridge: [['Có những ân tình chẳng nói thành lời', 'Gửi vào bài ca vang mãi khắp nơi']]
    },
    {
      id: 'xinloi', label: 'Xin lỗi', titles: ['Cho {T} Xin Lỗi', 'Gửi {N} Lời Xin Lỗi', 'Như Ngày Xưa'],
      chorus: [
        ['{N} ơi cho {T} xin lỗi', 'Vì những lần {T} vô tâm nói vội', 'Mong {B} mở lòng tha thứ một lần', 'Để ta lại gần như những ngày xuân']
      ],
      pairs: [
        ['Có những lời {T} lỡ nói ra', 'Làm {B} buồn và đôi ta cách xa'],
        ['Đêm nay ngồi đây lặng lẽ một mình', 'Mới thấy {B} là cả một trời bình minh'],
        ['Giá như hôm ấy {T} nói nhẹ nhàng', 'Thì đâu có những giọt nước mắt muộn màng']
      ],
      bridge: [['Từ nay {T} hứa sẽ đổi thay', 'Trân trọng {B} hơn mỗi một ngày']]
    },
    {
      id: 'cuoi', label: 'Đám cưới', titles: ['Ngày Vui Của {N}', 'Trăm Năm Hạnh Phúc', 'Lên Xe Hoa'],
      chorus: [
        ['Hôm nay {N} lên xe hoa', 'Pháo hồng rộn rã khắp cả ngõ nhà', 'Trăm năm hạnh phúc bên nhau', 'Sắt son một lòng mãi chẳng phai màu']
      ],
      pairs: [
        ['Duyên trời se kết đôi lứa thành đôi', 'Từ nay chung lối chung một nụ cười'],
        ['Chúc cho uyên ương mãi mãi bên nhau', 'Đầu bạc răng long son sắt trước sau'],
        ['Áo cưới tinh khôi rạng rỡ hôm nay', 'Hai trái tim chung nhịp đập từng ngày']
      ],
      bridge: [['Tay trong tay trước bao người thân', 'Lời thề nguyền vang mãi muôn phần']]
    },
    {
      id: 'totnghiep', label: 'Tốt nghiệp', titles: ['Chúc Mừng {N}', 'Ước Mơ Bay Xa', 'Hành Trang Mới'],
      chorus: [
        ['Chúc mừng {N} hôm nay', 'Bao năm cố gắng đã có ngày này', 'Bước ra đời với ước mơ bay', 'Tương lai rộng mở trong tầm tay']
      ],
      pairs: [
        ['Những đêm thức khuya bên trang sách dày', 'Mồ hôi hôm qua kết trái hôm nay'],
        ['Mũ áo hôm nay rạng rỡ nụ cười', 'Hành trang mang theo cho chặng đường đời'],
        ['Thầy cô bạn bè tiễn bước chân đi', 'Mang theo ước mơ của tuổi xuân thì']
      ],
      bridge: [['Dù đường phía trước có bao chông gai', 'Tin {B} sẽ vững bước tới tương lai']]
    },
    {
      id: 'tet', label: 'Chúc Tết / Năm mới', titles: ['Xuân Về Rồi {N} Ơi', 'Chúc {N} Năm Mới', 'Mùa Xuân Sum Vầy'],
      chorus: [
        ['Xuân về rồi {N} ơi', 'Mai đào khoe sắc rộn ràng khắp nơi', 'Chúc {B} năm mới an khang', 'Phát tài như ý vạn sự bình an']
      ],
      pairs: [
        ['Pháo hoa rực sáng đêm giao thừa', 'Gió xuân mang theo lời chúc đong đưa'],
        ['Năm cũ qua đi gác lại muộn phiền', 'Năm mới đón chào bao điều bình yên'],
        ['Bánh chưng xanh bên nồi nước sôi', 'Cả nhà quây quần rộn tiếng nói cười']
      ],
      bridge: [['Cùng nâng ly chúc nhau đầu xuân', 'Sum vầy hạnh phúc mãi muôn phần']]
    },
    {
      id: 'phunu', label: 'Ngày Phụ nữ 8/3 - 20/10', titles: ['Đóa Hoa Tặng {N}', 'Ngày Của {N}', 'Dịu Dàng'],
      chorus: [
        ['Hôm nay là ngày của {N}', 'Gửi trao bó hoa thắm tươi thật xinh', 'Chúc {B} luôn trẻ đẹp rạng ngời', 'Hạnh phúc ngập tràn ở khắp mọi nơi']
      ],
      pairs: [
        ['Như đóa hoa xinh tỏa sắc giữa đời', 'Dịu dàng đảm đang rạng rỡ nụ cười'],
        ['Một bó hoa tươi một lời yêu thương', 'Gửi đến {B} nhé giữa bao con đường'],
        ['Cảm ơn {B} bao vất vả lo toan', 'Cho những tháng ngày luôn ấm áp an toàn']
      ],
      bridge: [['Mong {B} mãi luôn là chính mình', 'Tươi vui như nắng mai bình minh']]
    },
    {
      id: 'nhagiao', label: 'Ngày Nhà giáo 20/11', titles: ['Tri Ân {N}', 'Người Lái Đò', 'Bục Giảng Năm Xưa'],
      chorus: [
        ['Tri ân {N} hôm nay', 'Bó hoa tươi thắm gửi trao tận tay', 'Bao năm dìu dắt bao lớp người', 'Ơn {B} sâu nặng như biển như trời']
      ],
      pairs: [
        ['Phấn trắng bảng đen những ngày thơ ngây', '{B} dạy {T} nên người từng phút từng giây'],
        ['Như người lái đò lặng lẽ sang sông', 'Đưa bao thế hệ cập bến ước mong'],
        ['Lời {B} giảng năm nào vẫn vang trong tim', 'Dẫn lối {T} qua những lúc đắm chìm']
      ],
      bridge: [['Dù mai này có đi muôn phương', 'Vẫn nhớ về {B} nhớ mái trường']]
    },
    {
      id: 'dongvien', label: 'Động viên', titles: ['{N} Ơi Đừng Buồn', 'Sau Cơn Mưa', 'Có {T} Ở Đây'],
      chorus: [
        ['{N} ơi đừng buồn nữa nhé', 'Sau cơn mưa trời lại sáng trong xanh', 'Mọi khó khăn rồi sẽ qua nhanh', 'Có {T} luôn ở đây bên {B} chân thành']
      ],
      pairs: [
        ['Đường đời đâu phải lúc nào cũng êm', 'Vấp ngã một lần ta lại mạnh thêm'],
        ['Hãy cứ mỉm cười dẫu cho gian nan', 'Nắng mai sẽ lên xua tan mây ngàn'],
        ['Những giọt nước mắt rồi sẽ khô thôi', 'Ngày mai {B} lại rạng rỡ nụ cười']
      ],
      bridge: [['Tin vào chính mình {B} sẽ làm được', 'Ngày mai tươi sáng đang chờ phía trước']]
    },
    {
      id: 'chiatay', label: 'Chia tay / Tạm biệt', titles: ['Hẹn Ngày Gặp Lại', 'Gửi {N} Trước Lúc Xa', 'Tạm Biệt {N}'],
      chorus: [
        ['{N} ơi mai này xa nhau', 'Mang theo kỷ niệm đẹp như sắc màu', 'Dù đi đâu nhớ về nơi đây', 'Có {T} vẫn nhớ {B} từng phút giây']
      ],
      pairs: [
        ['Bao nhiêu ngày vui ta đã cùng nhau', 'Giờ đây chia tay lòng sao nghẹn ngào'],
        ['Chúc {B} lên đường thật nhiều niềm vui', 'Bước chân thênh thang đi khắp muôn nơi'],
        ['Sân ga chiều nay gió thổi thật buồn', 'Mà trong tim {T} kỷ niệm vẫn còn']
      ],
      bridge: [['Hẹn một ngày mai ta gặp lại', 'Nụ cười vẫn thế tình vẫn mãi']]
    },
    {
      id: 'loiyeu', label: 'Lời yêu thương', titles: ['Yêu {N}', 'Lời Yêu Gửi {N}', 'Có {B} Là Đủ'],
      chorus: [['Yêu {N} yêu thật nhiều', 'Yêu từ ánh mắt yêu cả những buổi chiều', 'Có {B} là có cả đất trời', 'Bên nhau trọn kiếp chẳng rời']],
      pairs: [
        ['Mỗi sớm mai thức dậy có {B} bên đời', 'Là bao hạnh phúc chẳng cần nói thành lời'],
        ['Bàn tay {B} ấm như nắng mùa đông', 'Ánh mắt {B} trong như dòng sông'],
        ['Giữa phố đông người {T} chỉ thấy {B} thôi', 'Như ánh sao đêm sáng giữa bầu trời']
      ],
      bridge: [['Chẳng cần gì nhiều chỉ cần có nhau', 'Đi cùng {B} đến tận mai sau']]
    },
    {
      id: 'nho', label: 'Gửi nỗi nhớ', titles: ['Nhớ {N}', 'Gửi {N} Nỗi Nhớ', 'Xa Rồi Mới Thấy Nhớ'],
      chorus: [['{N} ơi {T} nhớ {B} nhiều lắm', 'Nhớ nụ cười nhớ cả những tháng năm', 'Bao nhiêu cách trở xa xôi', 'Chẳng thể ngăn nỗi nhớ trong {T} thôi']],
      pairs: [
        ['Đêm nay trăng sáng một mình {T} ngồi', 'Đếm từng ngày xa vắng tiếng {B} cười'],
        ['Gió đưa nỗi nhớ bay qua bao miền', 'Gửi về {B} đó một lời bình yên'],
        ['Phố quen vẫn đó mà thiếu bóng hình', 'Con đường mình qua giờ lặng lẽ một mình']
      ],
      bridge: [['Ngày mai gặp lại {T} sẽ ôm {B} thật lâu', 'Để bù cho những ngày dài xa nhau']]
    },
    {
      id: 'cauhon', label: 'Cầu hôn', titles: ['Về Chung Một Nhà', 'Gửi {N} Lời Cầu Hôn', 'Trọn Đời Bên {B}'],
      chorus: [['{N} ơi về chung một nhà', 'Cùng {T} đi hết tháng năm chẳng rời xa', 'Chiếc nhẫn này thay lời hứa', 'Yêu {B} trọn đời dẫu nắng hay mưa']],
      pairs: [
        ['Bao năm bên nhau qua những ngọt bùi', '{T} biết đời mình chỉ cần {B} thôi'],
        ['Hôm nay {T} quỳ xuống giữa trời sao', 'Trao {B} trái tim với bao khát khao'],
        ['Mai này ta có một mái nhà xinh', 'Có tiếng trẻ thơ có cả hai mình']
      ],
      bridge: [['Nếu {B} đồng ý xin hãy gật đầu', 'Để {T} được yêu {B} đến mai sau']]
    },
    {
      id: 'tuongnho', label: 'Tưởng nhớ', titles: ['Nhớ Về {N}', 'Gửi {N} Nơi Xa', 'Mãi Trong Tim'],
      chorus: [['{N} ơi giờ ở phương nào', 'Có nghe {T} gọi trong những chiều nao', 'Dẫu cho cách biệt đôi bờ', 'Trong tim {T} mãi chẳng phai mờ']],
      pairs: [
        ['Ngày {B} đi xa gió cũng lặng thinh', 'Để lại {T} với bao kỷ niệm mình'],
        ['Nụ cười hiền ấy vẫn ở trong tim', 'Mỗi khi nhớ về {T} lặng lẽ đi tìm'],
        ['Ngọn nến lung linh thắp sáng hôm nay', 'Gửi đến {B} bao thương nhớ đong đầy']
      ],
      bridge: [['Mong {B} nơi ấy mãi bình yên', 'Tình thương này {T} giữ mãi vẹn nguyên']]
    },
    {
      id: 'yeuthuong', label: 'Gửi yêu thương (bất kỳ)', titles: ['Gửi {N}', 'Bài Hát Cho {N}', 'Lời Thương Gửi {N}'],
      chorus: [
        ['Bài hát này {T} gửi {N}', 'Gửi bao yêu thương gửi cả chân tình', 'Mong {B} luôn vui luôn bình yên', 'Mỗi ngày trôi qua thật xinh'],
        ['{N} ơi có biết không', 'Trong tim {T} luôn có {B} một khoảng trời hồng', 'Dù mai nắng gió phương nào', 'Vẫn mong {B} mãi ngọt ngào']
      ],
      pairs: [
        ['Có những điều giản đơn mà thân quen', 'Như tiếng cười {B} giữa phố lên đèn'],
        ['Gửi đến {B} lời ca nhỏ hôm nay', 'Như cơn gió mát thổi qua tháng ngày'],
        ['Mong {B} luôn vui dù nắng hay mưa', 'Bình an hạnh phúc như những ngày xưa']
      ],
      bridge: [['Chẳng cần gì nhiều chỉ mong {B} cười', 'Là đủ cho {T} thấy đẹp cả cuộc đời']]
    }
  ];

  const OCC_UI = [
    ['sinhnhat', 'Sinh nhật'], ['kyniem', 'Kỷ niệm ngày yêu'], ['loiyeu', 'Lời yêu thương'], ['camon', 'Cảm ơn · Tri ân'],
    ['nho', 'Gửi nỗi nhớ'], ['xinloi', 'Xin lỗi'], ['dongvien', 'Động viên'], ['totnghiep', 'Tốt nghiệp'], ['cuoi', 'Mừng đám cưới'],
    ['cauhon', 'Cầu hôn'], ['khonglydo', 'Không cần lý do'], ['tuongnho', 'Tưởng nhớ'], ['khac', 'Dịp khác']
  ].map(([id, label]) => ({ id, label }));
  const OCC_ALIAS = { khonglydo: 'yeuthuong', khac: 'yeuthuong' };

  // Nét tính cách -> câu hát
  const TRAIT_PAIRS = [
    ['{P}', 'Là điều làm {T} thương mãi không thôi'],
    ['{P}', 'Ai gặp {B} rồi cũng chẳng thể nào quên'],
    ['{P}', 'Như nắng ấm áp giữa những ngày đông'],
    ['{P}', 'Đó là {B} người {T} quý nhất trên đời']
  ];

  // Mẫu câu đưa câu chuyện của người dùng vào lời
  const STORY_PAIRS = [
    ['Nhớ hoài {P}', 'Kỷ niệm ấy vẫn còn mãi trong tim'],
    ['Có những ngày {P}', 'Là những ngày {T} chẳng thể nào quên'],
    ['{B} có nhớ không {P}', 'Bao yêu thương cứ thế lớn dần lên'],
    ['Vẫn nhớ chuyện {P}', '{T} kể hoài như chuyện cổ tích xinh'],
    ['Ngày ấy {P}', 'Giờ nghĩ lại thấy lòng thật bình yên']
  ];

  // ---------- Tiện ích ----------
  function rng(seed) { // mulberry32
    let a = seed >>> 0;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length) % arr.length]; }
  function shuffle(r, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function cap(s) { s = s.trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function titleCase(s) { return s.split(/\s+/).map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' '); }

  function fill(line, ctx) {
    return cap(line.replace(/\{N\}/g, ctx.N).replace(/\{T\}/g, ctx.T).replace(/\{B\}/g, ctx.B).replace(/\{P\}/g, ctx.P || '').replace(/\s+/g, ' '));
  }

  // Tách câu chuyện thành các cụm ngắn để đưa vào lời
  function storyPhrases(text) {
    if (!text) return { mem: [], wish: [] };
    const parts = text.replace(/[“”"()]/g, ' ').split(/[.,;!?\n…:]+|\s+-\s+/).map(s => s.trim().replace(/\s+/g, ' ')).filter(Boolean);
    const mem = [], wish = [];
    for (let p of parts) {
      const w = p.split(' ');
      if (w.length < 2) continue;
      if (w.length > 9) p = w.slice(0, 9).join(' ');
      const low = p.charAt(0).toLowerCase() + p.slice(1);
      if (/^(chúc|mong|hy vọng|hi vọng|ước|cầu)/i.test(p)) wish.push(cap(p));
      else mem.push(low);
    }
    return { mem, wish };
  }

  const low1 = p => p.charAt(0).toLowerCase() + p.slice(1);
  // tách thành cụm, gộp các cụm quá ngắn để thành câu hát đủ dài (5–12 chữ)
  function phrases(text, max) {
    if (!text) return [];
    max = max || 12;
    const parts = text.replace(/[“”"()]/g, ' ').split(/[.,;!?\n…:]+|\s+-\s+/).map(x => x.trim().replace(/\s+/g, ' ')).filter(Boolean);
    const out = []; let cur = '';
    parts.forEach(p => {
      const wc = s => s ? s.split(' ').length : 0;
      if (!cur) cur = p;
      else if (wc(cur) < 5 && wc(cur) + wc(p) <= max) cur += ' ' + low1(p);
      else { out.push(cur); cur = p; }
    });
    if (cur) out.push(cur);
    return out.filter(x => x.split(' ').length >= 2).map(x => { const w = x.split(' '); return w.length > max ? w.slice(0, max).join(' ') : x; });
  }

  // ----- Lời tiếng Anh (offline, dùng cho "Pop (tiếng Anh)") -----
  const EN = {
    chorus: {
      sinhnhat: ['Happy birthday {N}', 'Make a wish and let it fly', 'Every candle every light', 'Shines for you tonight'],
      _: ['{N} this song is for you', 'Every word I sing is true', 'Through the sunny days and grey', 'I will be there every day']
    },
    pairs: [
      ['From the moment that we met', 'You gave me days I won\'t forget'],
      ['When the world was cold and grey', 'You were there to light the way'],
      ['Every laugh and every tear', 'I am grateful you are here'],
      ['Hand in hand we walked along', 'You became my favorite song']
    ],
    mem: ['I remember {P}', 'Every moment feels so near'],
    trait: ['{P}', 'That is why you mean the world to me'],
    bridge: ['And if you ever doubt my heart', 'Just play this song we\'ll never be apart']
  };
  function composeEn(o, r, N) {
    const f = l => cap(l.replace(/\{N\}/g, N).replace(/\{P\}/g, o.P || ''));
    const pairs = shuffle(r, EN.pairs);
    const mem = phrases(o.story, 8), tr = phrases(o.traits, 8), msg = phrases(o.message, 10);
    const v1 = (tr[0] ? [cap(tr[0]), EN.trait[1]] : pairs[0]).concat(pairs[1]);
    const v2 = (mem[0] ? [f(EN.mem[0].replace('{P}', low1(mem[0]))), EN.mem[1]] : pairs[2]).concat(mem[1] ? [f(EN.mem[0].replace('{P}', low1(mem[1]))), EN.mem[1]] : pairs[3]);
    const ch = (EN.chorus[o.occasion] || EN.chorus._).map(f);
    const br = msg[0] ? [cap(msg[0]), 'That is what I want to say'] : EN.bridge.slice();
    const sections = [
      { type: 'verse', label: 'Verse 1', lines: v1 }, { type: 'chorus', label: 'Chorus', lines: ch },
      { type: 'verse', label: 'Verse 2', lines: v2 }, { type: 'chorus', label: 'Chorus', lines: ch },
      { type: 'bridge', label: 'Bridge', lines: br }, { type: 'chorus', label: 'Chorus', lines: ch },
      { type: 'outro', label: 'Outro', lines: ['This song is just for you ' + N] }
    ];
    return { title: 'A Song For ' + N, sections, text: toText(sections) };
  }

  /**
   * Soạn lời bài hát theo các câu trả lời (giống ForeverSongs).
   * opt: {occasion, relation, sender:'nam'|'nu', name, traits, story, message, from, seed, lang}
   */
  function compose(opt) {
    const r = rng(opt.seed || Date.now());
    const rel = RELATIONS.find(x => x.id === opt.relation) || RELATIONS[RELATIONS.length - 1];
    const oid = OCC_ALIAS[opt.occasion] || opt.occasion;
    const occ = OCCASIONS.find(x => x.id === oid) || OCCASIONS[OCCASIONS.length - 1];
    const [T, B] = rel.pr(opt.sender);
    const name = (opt.name || '').trim();
    if (opt.lang === 'en') return composeEn(opt, r, name || 'my dear');
    const ctx = { T, B, N: name || B };
    const F = p => p.map(l => fill(l, ctx));

    const relPairs = shuffle(r, REL_BANK[rel.bank] || REL_BANK.general);
    const occPairs = shuffle(r, occ.pairs);
    let ri = 0, oi = 0;
    const nextRel = () => F(relPairs[(ri++) % relPairs.length]);
    const nextOcc = () => F(occPairs[(oi++) % occPairs.length]);

    const traits = phrases(opt.traits, 12).slice(0, 2);
    const st = storyPhrases(opt.story);
    const mem = st.mem.slice(0, 3);
    const msg = phrases(opt.message, 12);
    const trTpl = shuffle(r, TRAIT_PAIRS), stTpl = shuffle(r, STORY_PAIRS);
    const traitPair = i => traits[i] ? [cap(traits[i]), fill(trTpl[i % trTpl.length][1], ctx)] : null;
    const memPair = i => mem[i] ? [fill(stTpl[i % stTpl.length][0], Object.assign({}, ctx, { P: mem[i] })), fill(stTpl[i % stTpl.length][1], ctx)] : null;

    const v1 = [].concat(memPair(0) || nextRel(), traitPair(0) || nextOcc());
    const v2 = [].concat(memPair(1) || traitPair(1) || nextRel(), memPair(2) || nextOcc());
    const chorus = F(pick(r, occ.chorus));
    let bridge;
    const wish = msg[0] || st.wish[0];
    if (wish) bridge = [cap(wish), fill(msg[1] ? cap(msg[1]) : pick(r, ['Đó là điều {T} muốn nói hôm nay', 'Gửi theo lời ca đến {B} hôm nay', 'Là lời {T} giữ mãi trong tim này']), ctx)];
    else bridge = F(pick(r, occ.bridge));
    const from = (opt.from || '').trim();
    const outro = [fill(from ? 'Bài hát này ' + from + ' gửi tặng {N}' : pick(r, ['Bài hát này {T} gửi tặng {N}', 'Thương gửi về {N} hôm nay', '{N} ơi mãi bình yên nhé']), ctx)];

    const title = titleCase(fill(pick(r, occ.titles), ctx));
    const sections = [
      { type: 'verse', label: 'Phiên khúc 1', lines: v1 },
      { type: 'chorus', label: 'Điệp khúc', lines: chorus },
      { type: 'verse', label: 'Phiên khúc 2', lines: v2 },
      { type: 'chorus', label: 'Điệp khúc', lines: chorus },
      { type: 'bridge', label: 'Cầu nối', lines: bridge },
      { type: 'chorus', label: 'Điệp khúc', lines: chorus },
      { type: 'outro', label: 'Kết', lines: outro }
    ];
    return { title, sections, text: toText(sections) };
  }

  function toText(sections) {
    return sections.map(s => '[' + s.label + ']\n' + s.lines.join('\n')).join('\n\n');
  }

  // Đọc lời (do người dùng sửa / AI viết) thành các đoạn
  function parse(text) {
    const out = [];
    let cur = null;
    const typeOf = h => {
      const x = h.toLowerCase();
      if (/điệp|chorus|refrain|dk/.test(x)) return 'chorus';
      if (/cầu|bridge/.test(x)) return 'bridge';
      if (/kết|outro|vĩ thanh/.test(x)) return 'outro';
      if (/mở|intro|dạo/.test(x)) return 'intro';
      return 'verse';
    };
    (text || '').split(/\r?\n/).forEach(raw => {
      let l = raw.trim();
      if (!l) return;
      const m = l.match(/^\[(.+?)\]$/) || l.match(/^\*\*(.+?)\*\*$/) || l.match(/^#+\s*(.+)$/) || l.match(/^((?:phiên khúc|điệp khúc|cầu nối|kết|verse|chorus|bridge|outro|intro|đoạn)[^:]*):?$/i);
      if (m) { cur = { type: typeOf(m[1]), label: m[1].replace(/[:*]/g, '').trim(), lines: [] }; out.push(cur); return; }
      l = l.replace(/^[-*•\d.)\s]+/, '').replace(/[*_"]/g, '').trim();
      if (!l) return;
      if (!cur) { cur = { type: 'verse', label: 'Phiên khúc', lines: [] }; out.push(cur); }
      cur.lines.push(l);
    });
    return out.filter(s => s.lines.length);
  }

  G.Lyrics = { RELATIONS, OCCASIONS, OCC_UI, OCC_ALIAS, compose, parse, toText, rng, storyPhrases };
})(window);
