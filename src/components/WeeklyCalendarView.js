import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';

// TODO: Import FullCalendar CSS if not handled globally
// import '@fullcalendar/core/main.css';
// import '@fullcalendar/daygrid/main.css';
// import '@fullcalendar/timegrid/main.css';

const WeeklyCalendarView = ({ events, onDateClick, onEventClick, onDatesSet }) => {
  // Custom function to render event content
  const renderEventContent = (eventInfo) => {
    // Placeholder for tier-based styling - replace with actual tier from eventInfo.event.extendedProps.tier
    const tier = eventInfo.event.extendedProps?.tier || 'default';
    let eventClasses = 'p-1.5 text-xs rounded-lg border h-full flex flex-col justify-center hover:shadow-lg transition-shadow duration-200 ease-in-out';

    // Example tier-based styling (can be expanded)
    if (tier === 'TIER_1_CHAMPION') {
      eventClasses += ' bg-purple-100 border-purple-300 text-purple-800';
    } else if (tier === 'TIER_2_PERFORMER') {
      eventClasses += ' bg-blue-100 border-blue-300 text-blue-800';
    } else if (tier === 'TIER_3_DEVELOPER') {
      eventClasses += ' bg-green-100 border-green-300 text-green-800';
    } else if (tier === 'TIER_4_PROSPECT') {
      eventClasses += ' bg-gray-100 border-gray-300 text-gray-700';
    } else { // Default styling
      eventClasses += ' bg-sky-100 border-sky-300 text-sky-800';
    }

    return (
      <div className={eventClasses}>
        <div className="font-semibold truncate">{eventInfo.event.title}</div>
        {eventInfo.timeText && <div className="text-[10px] opacity-75">{eventInfo.timeText}</div>}
        {/* <div className="text-[10px] opacity-75">{tier.replace('_', ' ')}</div> */}
      </div>
    );
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow"> {/* Container already has good base styling */}
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek" // Changed to weekly view
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        events={events} // Expecting events in FullCalendar format
        dateClick={onDateClick} // Handler for clicking on a date
        eventClick={onEventClick} // Handler for clicking on an event
        datesSet={onDatesSet} // Handler for when the displayed date range changes
        editable={false} // True if we want drag-and-drop editing
        selectable={true} // True if we want to allow date range selection
        selectMirror={true}
        dayMaxEvents={true} // True to limit the number of events per day, showing a "+more" link
        weekends={true} // Show weekends
        eventContent={renderEventContent} // Use custom event rendering
        // Add more props and styling as needed for "world-class UI"
        height="auto" // Adjust height as needed, 'auto' or a fixed value like '600px'
        // aspectRatio={1.5} // Adjust aspect ratio, can be fine-tuned
        buttonText={{
          today: 'Today',
          month: 'Month',
          week: 'Week',
          day: 'Day',
          list: 'List'
        }}
        // Style with Tailwind by targeting FullCalendar's classes or using its own theming system
      />
    </div>
  );
};

// Example custom event rendering function (to be implemented later)
// function renderEventContent(eventInfo) {
//   return (
//     <>
//       <b>{eventInfo.timeText}</b>
//       <i>{eventInfo.event.title}</i>
//       {/* Add tier, priority, etc. here */}
//     </>
//   );
// }

export default WeeklyCalendarView;
