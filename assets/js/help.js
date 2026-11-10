/* HELP — как сдавать работы через GitHub и как установить среду на компьютер. */
(function () {
  "use strict";
  var O = window.OGL, el = O.el;
  O.header("help", [{ text: "Темы", href: O.link("") }, { text: "Как сдать работу" }]);
  var main = el("main", { class: "wrap doc" }); document.body.appendChild(main);
  var repo = "https://github.com/" + O.REPO;
  main.appendChild(el("div", { class: "pagehead flat" }, el("p", { class: "kicker" }, "Справка"), el("h1", null, "Как сдать работу")));
  main.appendChild(el("section", { class: "blk" }, el("h2", null, "1. Аккаунт GitHub"),
    el("ol", { class: "num" },
      el("li", null, "Откройте ", el("a", { href: "https://github.com/signup", target: "_blank", rel: "noopener" }, "github.com/signup"), " и зарегистрируйтесь (бесплатно): адрес почты, пароль, имя пользователя. Подтвердите почту кодом из письма."),
      el("li", null, "Имя пользователя лучше выбрать нейтральное (например, латиницей фамилия и год). Сообщите его преподавателю — он внесёт его в список группы."),
      el("li", null, "Студентам доступен бесплатный пакет GitHub Education, но для сдачи работ он не нужен."))));
  main.appendChild(el("section", { class: "blk" }, el("h2", null, "2. Отправка работы"),
    el("ol", { class: "num" },
      el("li", null, "Выполните задание в лаборатории, в песочнице или в Visual Studio."),
      el("li", null, "Нажмите «Сдать работу» (на странице «Задания» темы или в песочнице). Укажите ID из списка группы, группу и вариант. Фамилию не пишите: репозиторий открытый, по ID работу узнаёт только преподаватель."),
      el("li", null, "Откроется страница GitHub «New issue» с заполненными полями. Если код длинный, он копируется в буфер обмена — вставьте его в поле «Код программы (.cpp)»."),
      el("li", null, "Сохраните скриншот окна (кнопка «Скриншот» в редакторе) и перетащите его в поле «Скриншот и файлы». Для СРС 2 туда же перетащите отчёт (PDF или DOCX)."),
      el("li", null, "Нажмите «Create». Работа появилась в списке ", el("a", { href: repo + "/issues", target: "_blank", rel: "noopener" }, "Issues"), " репозитория курса."))));
  main.appendChild(el("section", { class: "blk" }, el("h2", null, "3. Проверка и статусы"),
    el("dl", { class: "defs" },
      el("dt", null, "Отправлено"), el("dd", null, "Работа ждёт проверки."),
      el("dt", null, "Принято"), el("dd", null, "Преподаватель принял работу. Обращение на GitHub закрывается."),
      el("dt", null, "На доработку"), el("dd", null, "В комментарии указано, что исправить. Исправьте код и отправьте работу ещё раз (новым обращением) или ответьте в том же обращении.")),
    el("p", null, "Посещаемость и статусы всех ваших работ — в разделе ", el("a", { href: O.link("me/") }, "«Мой кабинет»"), ": войдите по ID и коду доступа, который выдал преподаватель.")));
  main.appendChild(el("section", { class: "blk" }, el("h2", null, "4. Работа на своём компьютере"),
    el("p", null, "Код из лабораторий и песочницы — обычная программа C++ с freeglut. Чтобы собрать её локально:"),
    el("ol", { class: "num" },
      el("li", null, "Установите Visual Studio 2022 Community с рабочей нагрузкой «Разработка классических приложений на C++»."),
      el("li", null, "Создайте проект «Пустой проект» (C++), добавьте файл main.cpp и вставьте код."),
      el("li", null, "Подключите freeglut одним из способов: через менеджер пакетов vcpkg (", el("code", null, "vcpkg install freeglut"), ", затем ", el("code", null, "vcpkg integrate install"), ") или через NuGet (Проект → Управление пакетами NuGet → пакет с freeglut для Visual C++)."),
      el("li", null, "Для загрузки изображений (stbi_load) скачайте один файл stb_image.h из репозитория nothings/stb, добавьте в проект и перед подключением напишите ", el("code", null, "#define STB_IMAGE_IMPLEMENTATION"), ". Файлы текстур песочницы (положите их рядом с .exe): ", ["brick", "wood", "checker", "marble", "crate", "grass", "stone", "water", "earth", "metal", "glass", "tiles"].map(function (t, i) { return [i ? ", " : "", el("a", { href: O.link("assets/tex/" + t + ".png"), download: t + ".png" }, t + ".png")]; }), "."),
      el("li", null, "Соберите и запустите (F5). Результат совпадает с окном в браузере."))));
  main.appendChild(el("section", { class: "blk" }, el("h2", null, "Частые вопросы"),
    el("details", { class: "qa-i" }, el("summary", null, el("span", null, "Нет компьютера — можно ли работать с телефона?")), el("div", { class: "qa-a" }, el("p", null, "Да. Лаборатории и песочница работают в мобильном браузере; удобнее с внешней клавиатурой."))),
    el("details", { class: "qa-i" }, el("summary", null, el("span", null, "Отправил не тот файл. Что делать?")), el("div", { class: "qa-a" }, el("p", null, "Отправьте работу ещё раз и в комментарии напишите, что предыдущая отправка ошибочная. Преподаватель проверяет последнюю."))),
    el("details", { class: "qa-i" }, el("summary", null, el("span", null, "Видят ли другие студенты мой код?")), el("div", { class: "qa-a" }, el("p", null, "Репозиторий курса открытый, поэтому отправленные работы видны всем. Списывание легко обнаружить: у каждого свой вариант, а при приёме работы преподаватель задаёт вопросы по коду."))),
    el("details", { class: "qa-i" }, el("summary", null, el("span", null, "Забыл код доступа к кабинету.")), el("div", { class: "qa-a" }, el("p", null, "Обратитесь к преподавателю — он выдаст новый.")))));
  O.footer();
})();
