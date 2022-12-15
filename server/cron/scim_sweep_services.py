import datetime
import logging
import time

from server.cron.shared import obtain_lock
from server.db.db import db
from server.db.domain import Service
from server.scim.sweep import perform_sweep

scim_sweep_services_lock_name = "scim_sweep_services_lock_name"


def _result_container():
    return []


def _do_scim_sweep_services(app):
    with app.app_context():
        now = datetime.datetime.utcnow()

        start = int(time.time() * 1000.0)
        logger = logging.getLogger("scheduler")
        logger.info("Start running scim_sweep_services job")

        services = Service.query.filter(Service.scim_enabled == True) \
            .filter(Service.sweep_scim_enabled == True) \
            .all()  # noqa: E712

        def service_needs_sweeping(service: Service):
            if service.sweep_scim_last_run is None:
                return True
            cutoff_time = service.sweep_scim_last_run + datetime.timedelta(hours=service.sweep_scim_daily_rate)
            return now > cutoff_time

        services_sweeping = [service for service in services if service_needs_sweeping(service)]
        aggregated_results = []
        for service in services_sweeping:
            sync_results = perform_sweep(service)
            aggregated_results.append({"name": service.name, "sync_results": sync_results})
            service.sweep_scim_last_run = datetime.datetime.utcnow()
            db.session.merge(service)
            db.session.commit()

        end = int(time.time() * 1000.0)
        logger.info(f"Finished running scim_sweep_services job in {end - start} ms")

        return aggregated_results


def scim_sweep_services(app):
    return obtain_lock(app, scim_sweep_services_lock_name, _do_scim_sweep_services, _result_container)
