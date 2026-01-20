import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import PageMeta from "../components/common/PageMeta";
const Calendar = () => {
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [eventTitle, setEventTitle] = useState("");
    const [eventStartDate, setEventStartDate] = useState("");
    const [eventEndDate, setEventEndDate] = useState("");
    const [eventLevel, setEventLevel] = useState("");
    const [events, setEvents] = useState([]);
    const calendarRef = useRef(null);
    const { isOpen, openModal, closeModal } = useModal();
    const calendarsEvents = {
        Danger: "danger",
        Success: "success",
        Primary: "primary",
        Warning: "warning",
    };
    useEffect(() => {
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
    const handleDateSelect = (selectInfo) => {
        resetModalFields();
        setEventStartDate(selectInfo.startStr);
        setEventEndDate(selectInfo.endStr || selectInfo.startStr);
        openModal();
    };
    const handleEventClick = (clickInfo) => {
        const event = clickInfo.event;
        setSelectedEvent(event);
        setEventTitle(event.title);
        setEventStartDate(event.start?.toISOString().split("T")[0] || "");
        setEventEndDate(event.end?.toISOString().split("T")[0] || "");
        setEventLevel(event.extendedProps.calendar);
        openModal();
    };
    const handleAddOrUpdateEvent = () => {
        if (selectedEvent) {
            // Update existing event
            setEvents((prevEvents) => prevEvents.map((event) => event.id === selectedEvent.id
                ? {
                    ...event,
                    title: eventTitle,
                    start: eventStartDate,
                    end: eventEndDate,
                    extendedProps: { calendar: eventLevel },
                }
                : event));
        }
        else {
            // Add new event
            const newEvent = {
                id: Date.now().toString(),
                title: eventTitle,
                start: eventStartDate,
                end: eventEndDate,
                allDay: true,
                extendedProps: { calendar: eventLevel },
            };
            setEvents((prevEvents) => [...prevEvents, newEvent]);
        }
        closeModal();
        resetModalFields();
    };
    const resetModalFields = () => {
        setEventTitle("");
        setEventStartDate("");
        setEventEndDate("");
        setEventLevel("");
        setSelectedEvent(null);
    };
    return (_jsxs(_Fragment, { children: [_jsx(PageMeta, { title: "React.js Calendar Dashboard | TailAdmin - Next.js Admin Dashboard Template", description: "This is React.js Calendar Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template" }), _jsxs("div", { className: "rounded-2xl border  border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]", children: [_jsx("div", { className: "custom-calendar", children: _jsx(FullCalendar, { ref: calendarRef, plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin], initialView: "dayGridMonth", headerToolbar: {
                                left: "prev,next addEventButton",
                                center: "title",
                                right: "dayGridMonth,timeGridWeek,timeGridDay",
                            }, events: events, selectable: true, select: handleDateSelect, eventClick: handleEventClick, eventContent: renderEventContent, customButtons: {
                                addEventButton: {
                                    text: "Add Event +",
                                    click: openModal,
                                },
                            } }) }), _jsx(Modal, { isOpen: isOpen, onClose: closeModal, className: "max-w-[700px] p-6 lg:p-10", children: _jsxs("div", { className: "flex flex-col px-2 overflow-y-auto custom-scrollbar", children: [_jsxs("div", { children: [_jsx("h5", { className: "mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl", children: selectedEvent ? "Edit Event" : "Add Event" }), _jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Plan your next big moment: schedule or edit an event to stay on track" })] }), _jsxs("div", { className: "mt-8", children: [_jsx("div", { children: _jsxs("div", { children: [_jsx("label", { className: "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400", children: "Event Title" }), _jsx("input", { id: "event-title", type: "text", value: eventTitle, onChange: (e) => setEventTitle(e.target.value), className: "dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800" })] }) }), _jsxs("div", { className: "mt-6", children: [_jsx("label", { className: "block mb-4 text-sm font-medium text-gray-700 dark:text-gray-400", children: "Event Color" }), _jsx("div", { className: "flex flex-wrap items-center gap-4 sm:gap-5", children: Object.entries(calendarsEvents).map(([key, value]) => (_jsx("div", { className: "n-chk", children: _jsx("div", { className: `form-check form-check-${value} form-check-inline`, children: _jsxs("label", { className: "flex items-center text-sm text-gray-700 form-check-label dark:text-gray-400", htmlFor: `modal${key}`, children: [_jsxs("span", { className: "relative", children: [_jsx("input", { className: "sr-only form-check-input", type: "radio", name: "event-level", value: key, id: `modal${key}`, checked: eventLevel === key, onChange: () => setEventLevel(key) }), _jsx("span", { className: "flex items-center justify-center w-5 h-5 mr-2 border border-gray-300 rounded-full box dark:border-gray-700", children: _jsx("span", { className: `h-2 w-2 rounded-full bg-white ${eventLevel === key ? "block" : "hidden"}` }) })] }), key] }) }) }, key))) })] }), _jsxs("div", { className: "mt-6", children: [_jsx("label", { className: "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400", children: "Enter Start Date" }), _jsx("div", { className: "relative", children: _jsx("input", { id: "event-start-date", type: "date", value: eventStartDate, onChange: (e) => setEventStartDate(e.target.value), className: "dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800" }) })] }), _jsxs("div", { className: "mt-6", children: [_jsx("label", { className: "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400", children: "Enter End Date" }), _jsx("div", { className: "relative", children: _jsx("input", { id: "event-end-date", type: "date", value: eventEndDate, onChange: (e) => setEventEndDate(e.target.value), className: "dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800" }) })] })] }), _jsxs("div", { className: "flex items-center gap-3 mt-6 modal-footer sm:justify-end", children: [_jsx("button", { onClick: closeModal, type: "button", className: "flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto", children: "Close" }), _jsx("button", { onClick: handleAddOrUpdateEvent, type: "button", className: "btn btn-success btn-update-event flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 sm:w-auto", children: selectedEvent ? "Update Changes" : "Add Event" })] })] }) })] })] }));
};
const renderEventContent = (eventInfo) => {
    const colorClass = `fc-bg-${eventInfo.event.extendedProps.calendar.toLowerCase()}`;
    return (_jsxs("div", { className: `event-fc-color flex fc-event-main ${colorClass} p-1 rounded-sm`, children: [_jsx("div", { className: "fc-daygrid-event-dot" }), _jsx("div", { className: "fc-event-time", children: eventInfo.timeText }), _jsx("div", { className: "fc-event-title", children: eventInfo.event.title })] }));
};
export default Calendar;
