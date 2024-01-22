import datetime
import logging
import time

from server.cron.shared import obtain_lock
from server.db.db import db
from server.db.domain import Service
from server.logger.context_logger import ctx_logger
from server.scim.sweep import perform_sweep
from server.tools import dt_now

scim_sweep_services_lock_name = "scim_sweep_services_lock_name"


def _result_container():
    return {"services": []}


def _do_scim_sweep_services(app):
    ctx_logger("wonky").info("_do_scim_sweep_services")

    with app.app_context():
        start = int(time.time() * 1000.0)
        logger = logging.getLogger("scheduler")
        logger.info("Start running scim_sweep_services job")

        services = Service.query \
            .filter(Service.scim_enabled == True) \
            .filter(Service.sweep_scim_enabled == True) \
            .all()  # noqa: E712

        ctx_logger("wonky").info(f"services: {services}")

        now = dt_now()

        def service_needs_sweeping(service: Service):
            if service.sweep_scim_last_run is None:
                return True
            cutoff_time = service.sweep_scim_last_run + datetime.timedelta(hours=24 / service.sweep_scim_daily_rate)
            ctx_logger("wonky").info(f"service_need_sweeping: {service.entity_id} - {cutoff_time} < {now} : "
                                     f"{cutoff_time < now}")
            return cutoff_time < now

        services_sweeping = [service for service in services if service_needs_sweeping(service)]

        aggregated_results = _result_container()
        for service in services_sweeping:
            logger.info(f"Running scim_sweep for service {service.abbreviation} ({service.entity_id})")
            try:
                sync_results = perform_sweep(service)
                aggregated_results["services"].append({"name": service.name, "sync_results": sync_results})
                service.sweep_scim_last_run = now
                db.session.merge(service)
                db.session.commit()
            except BaseException as e:
                aggregated_results["services"].append({"name": service.name, "sync_results": str(e)})
                # Ensure the sweep for the remaining services continues
                pass

        end = int(time.time() * 1000.0)
        logger.info(f"Finished running scim_sweep_services job in {end - start} ms")

        return aggregated_results


def scim_sweep_services(app):
    ctx_logger("wonky").info("scim_sweep_services")
    return obtain_lock(app, scim_sweep_services_lock_name, _do_scim_sweep_services, _result_container)
