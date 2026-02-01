from icalendar import Calendar, Event as ICSEvent
from datetime import datetime
from typing import List, Dict, Any
import uuid


class CalendarService:
    """Service for generating ICS calendar files"""

    def generate_ics(
        self,
        itinerary: List[Dict[str, Any]],
        dates: List[str],
        city: str
    ) -> str:
        """
        Generate ICS calendar content from itinerary.
        
        Args:
            itinerary: List of itinerary items (each with a 'date' field)
            dates: List of date strings (YYYY-MM-DD) for fallback
            city: City name for metadata
            
        Returns:
            ICS file content as string
        """
        cal = Calendar()
        cal.add('prodid', '-//Metropolis Itinerary//metropolis.app//')
        cal.add('version', '2.0')
        cal.add('calscale', 'GREGORIAN')
        cal.add('x-wr-calname', f'Metropolis - {city} Itinerary')

        # Default date for events without a date field
        default_date = dates[0] if dates else datetime.now().strftime("%Y-%m-%d")

        for item in itinerary:
            event = ICSEvent()
            event.add('summary', item.get('title', 'Event'))
            event.add('description', item.get('description', ''))
            event.add('location', item.get('location', ''))

            # Use event's date field or fallback to default
            event_date_str = item.get('date', default_date)
            event_date = datetime.strptime(event_date_str, "%Y-%m-%d")

            start_time = self._parse_time(item.get('start_time', '09:00'))
            end_time = self._parse_time(item.get('end_time', '10:00'))

            event.add('dtstart', event_date.replace(
                hour=start_time.hour,
                minute=start_time.minute
            ))
            event.add('dtend', event_date.replace(
                hour=end_time.hour,
                minute=end_time.minute
            ))
            event.add('uid', str(uuid.uuid4()))

            cal.add_component(event)

        return cal.to_ical().decode('utf-8')

    def _parse_time(self, time_str: str) -> datetime:
        """Parse time string to datetime object"""
        try:
            return datetime.strptime(time_str, "%H:%M")
        except ValueError:
            return datetime.strptime("09:00", "%H:%M")
