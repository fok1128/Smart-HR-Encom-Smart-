"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var react_2 = require("@fullcalendar/react");
var daygrid_1 = require("@fullcalendar/daygrid");
var timegrid_1 = require("@fullcalendar/timegrid");
var interaction_1 = require("@fullcalendar/interaction");
var modal_1 = require("../components/ui/modal");
var useModal_1 = require("../hooks/useModal");
var PageMeta_1 = require("../components/common/PageMeta");
var Calendar = function () {
    var _a = (0, react_1.useState)(null), selectedEvent = _a[0], setSelectedEvent = _a[1];
    var _b = (0, react_1.useState)(""), eventTitle = _b[0], setEventTitle = _b[1];
    var _c = (0, react_1.useState)(""), eventStartDate = _c[0], setEventStartDate = _c[1];
    var _d = (0, react_1.useState)(""), eventEndDate = _d[0], setEventEndDate = _d[1];
    var _e = (0, react_1.useState)(""), eventLevel = _e[0], setEventLevel = _e[1];
    var _f = (0, react_1.useState)([]), events = _f[0], setEvents = _f[1];
    var calendarRef = (0, react_1.useRef)(null);
    var _g = (0, useModal_1.useModal)(), isOpen = _g.isOpen, openModal = _g.openModal, closeModal = _g.closeModal;
    var calendarsEvents = {
        Danger: "danger",
        Success: "success",
        Primary: "primary",
        Warning: "warning",
    };
    (0, react_1.useEffect)(function () {
        // Initialize with some events
        setEvents([
            {
                id: "1",
                title: "Event Conf.",
                start: new Date().toISOString().split("T")[0],
                extendedProps: { calendar: "Danger" },
            },
            {
                id: "2",
                title: "Meeting",
                start: new Date(Date.now() + 86400000).toISOString().split("T")[0],
                extendedProps: { calendar: "Success" },
            },
            {
                id: "3",
                title: "Workshop",
                start: new Date(Date.now() + 172800000).toISOString().split("T")[0],
                end: new Date(Date.now() + 259200000).toISOString().split("T")[0],
                extendedProps: { calendar: "Primary" },
            },
        ]);
    }, []);
    var handleDateSelect = function (selectInfo) {
        resetModalFields();
        setEventStartDate(selectInfo.startStr);
        setEventEndDate(selectInfo.endStr || selectInfo.startStr);
        openModal();
    };
    var handleEventClick = function (clickInfo) {
        var _a, _b;
        var event = clickInfo.event;
        setSelectedEvent(event);
        setEventTitle(event.title);
        setEventStartDate(((_a = event.start) === null || _a === void 0 ? void 0 : _a.toISOString().split("T")[0]) || "");
        setEventEndDate(((_b = event.end) === null || _b === void 0 ? void 0 : _b.toISOString().split("T")[0]) || "");
        setEventLevel(event.extendedProps.calendar);
        openModal();
    };
    var handleAddOrUpdateEvent = function () {
        if (selectedEvent) {
            // Update existing event
            setEvents(function (prevEvents) {
                return prevEvents.map(function (event) {
                    return event.id === selectedEvent.id
                        ? __assign(__assign({}, event), { title: eventTitle, start: eventStartDate, end: eventEndDate, extendedProps: { calendar: eventLevel } }) : event;
                });
            });
        }
        else {
            // Add new event
            var newEvent_1 = {
                id: Date.now().toString(),
                title: eventTitle,
                start: eventStartDate,
                end: eventEndDate,
                allDay: true,
                extendedProps: { calendar: eventLevel },
            };
            setEvents(function (prevEvents) { return __spreadArray(__spreadArray([], prevEvents, true), [newEvent_1], false); });
        }
        closeModal();
        resetModalFields();
    };
    var resetModalFields = function () {
        setEventTitle("");
        setEventStartDate("");
        setEventEndDate("");
        setEventLevel("");
        setSelectedEvent(null);
    };
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(PageMeta_1.default, { title: "React.js Calendar Dashboard | TailAdmin - Next.js Admin Dashboard Template", description: "This is React.js Calendar Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template" }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-2xl border  border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]", children: [(0, jsx_runtime_1.jsx)("div", { className: "custom-calendar", children: (0, jsx_runtime_1.jsx)(react_2.default, { ref: calendarRef, plugins: [daygrid_1.default, timegrid_1.default, interaction_1.default], initialView: "dayGridMonth", headerToolbar: {
                                left: "prev,next addEventButton",
                                center: "title",
                                right: "dayGridMonth,timeGridWeek,timeGridDay",
                            }, events: events, selectable: true, select: handleDateSelect, eventClick: handleEventClick, eventContent: renderEventContent, customButtons: {
                                addEventButton: {
                                    text: "Add Event +",
                                    click: openModal,
                                },
                            } }) }), (0, jsx_runtime_1.jsx)(modal_1.Modal, { isOpen: isOpen, onClose: closeModal, className: "max-w-[700px] p-6 lg:p-10", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col px-2 overflow-y-auto custom-scrollbar", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h5", { className: "mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl", children: selectedEvent ? "Edit Event" : "Add Event" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Plan your next big moment: schedule or edit an event to stay on track" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-8", children: [(0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400", children: "Event Title" }), (0, jsx_runtime_1.jsx)("input", { id: "event-title", type: "text", value: eventTitle, onChange: function (e) { return setEventTitle(e.target.value); }, className: "dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800" })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-6", children: [(0, jsx_runtime_1.jsx)("label", { className: "block mb-4 text-sm font-medium text-gray-700 dark:text-gray-400", children: "Event Color" }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap items-center gap-4 sm:gap-5", children: Object.entries(calendarsEvents).map(function (_a) {
                                                        var key = _a[0], value = _a[1];
                                                        return ((0, jsx_runtime_1.jsx)("div", { className: "n-chk", children: (0, jsx_runtime_1.jsx)("div", { className: "form-check form-check-".concat(value, " form-check-inline"), children: (0, jsx_runtime_1.jsxs)("label", { className: "flex items-center text-sm text-gray-700 form-check-label dark:text-gray-400", htmlFor: "modal".concat(key), children: [(0, jsx_runtime_1.jsxs)("span", { className: "relative", children: [(0, jsx_runtime_1.jsx)("input", { className: "sr-only form-check-input", type: "radio", name: "event-level", value: key, id: "modal".concat(key), checked: eventLevel === key, onChange: function () { return setEventLevel(key); } }), (0, jsx_runtime_1.jsx)("span", { className: "flex items-center justify-center w-5 h-5 mr-2 border border-gray-300 rounded-full box dark:border-gray-700", children: (0, jsx_runtime_1.jsx)("span", { className: "h-2 w-2 rounded-full bg-white ".concat(eventLevel === key ? "block" : "hidden") }) })] }), key] }) }) }, key));
                                                    }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-6", children: [(0, jsx_runtime_1.jsx)("label", { className: "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400", children: "Enter Start Date" }), (0, jsx_runtime_1.jsx)("div", { className: "relative", children: (0, jsx_runtime_1.jsx)("input", { id: "event-start-date", type: "date", value: eventStartDate, onChange: function (e) { return setEventStartDate(e.target.value); }, className: "dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800" }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-6", children: [(0, jsx_runtime_1.jsx)("label", { className: "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400", children: "Enter End Date" }), (0, jsx_runtime_1.jsx)("div", { className: "relative", children: (0, jsx_runtime_1.jsx)("input", { id: "event-end-date", type: "date", value: eventEndDate, onChange: function (e) { return setEventEndDate(e.target.value); }, className: "dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800" }) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3 mt-6 modal-footer sm:justify-end", children: [(0, jsx_runtime_1.jsx)("button", { onClick: closeModal, type: "button", className: "flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto", children: "Close" }), (0, jsx_runtime_1.jsx)("button", { onClick: handleAddOrUpdateEvent, type: "button", className: "btn btn-success btn-update-event flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 sm:w-auto", children: selectedEvent ? "Update Changes" : "Add Event" })] })] }) })] })] }));
};
var renderEventContent = function (eventInfo) {
    var colorClass = "fc-bg-".concat(eventInfo.event.extendedProps.calendar.toLowerCase());
    return ((0, jsx_runtime_1.jsxs)("div", { className: "event-fc-color flex fc-event-main ".concat(colorClass, " p-1 rounded-sm"), children: [(0, jsx_runtime_1.jsx)("div", { className: "fc-daygrid-event-dot" }), (0, jsx_runtime_1.jsx)("div", { className: "fc-event-time", children: eventInfo.timeText }), (0, jsx_runtime_1.jsx)("div", { className: "fc-event-title", children: eventInfo.event.title })] }));
};
exports.default = Calendar;
