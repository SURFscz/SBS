import logging


def obtain_lock(app, lock_name, success, failure):
    with app.app_context():
        logger = logging.getLogger("scheduler")
        cron_job_responsible = app.app_config.cron_job_responsible
        logger.info(f"Job lock requested for {lock_name}. Cron job responsible: {cron_job_responsible}")
        return success(app) if cron_job_responsible else failure()
